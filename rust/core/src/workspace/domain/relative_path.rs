use std::{fmt, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize};

use crate::workspace::error::WorkspacePathError;

/// Workspace 内单个文件或目录名称。
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct WorkspaceEntryName(String);

impl WorkspaceEntryName {
    pub fn parse(value: impl Into<String>) -> Result<Self, WorkspacePathError> {
        let value = value.into();
        validate_entry_name(&value)?;
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl<'de> Deserialize<'de> for WorkspaceEntryName {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::parse(value).map_err(serde::de::Error::custom)
    }
}

/// Workspace 根目录内部的 canonical UTF-8 路径。
#[derive(Debug, Clone, Default, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct WorkspaceRelativePath(String);

impl WorkspaceRelativePath {
    pub fn root() -> Self {
        Self::default()
    }

    pub fn parse(value: impl Into<String>) -> Result<Self, WorkspacePathError> {
        let value = value.into();
        validate_relative_path(&value)?;
        Ok(Self(value))
    }

    pub fn is_root(&self) -> bool {
        self.0.is_empty()
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn parent(&self) -> Option<Self> {
        if self.is_root() {
            return None;
        }
        Some(match self.0.rsplit_once('/') {
            Some((parent, _)) => Self(parent.to_string()),
            None => Self::root(),
        })
    }

    pub fn file_name(&self) -> Option<WorkspaceEntryName> {
        self.components()
            .next_back()
            .map(|name| WorkspaceEntryName(name.to_string()))
    }

    pub fn join(&self, child: &Self) -> Self {
        match (self.is_root(), child.is_root()) {
            (true, _) => child.clone(),
            (_, true) => self.clone(),
            _ => Self(format!("{}/{}", self.as_str(), child.as_str())),
        }
    }

    pub fn join_name(&self, child: &WorkspaceEntryName) -> Self {
        if self.is_root() {
            Self(child.as_str().to_string())
        } else {
            Self(format!("{}/{}", self.as_str(), child.as_str()))
        }
    }

    pub fn components(&self) -> impl DoubleEndedIterator<Item = &str> {
        self.0.split('/').filter(|component| !component.is_empty())
    }

    pub fn starts_with(&self, prefix: &Self) -> bool {
        if prefix.is_root() {
            return true;
        }
        self.0 == prefix.0
            || self
                .0
                .strip_prefix(prefix.as_str())
                .is_some_and(|suffix| suffix.starts_with('/'))
    }

    pub fn strip_prefix(&self, prefix: &Self) -> Option<Self> {
        if !self.starts_with(prefix) {
            return None;
        }
        if prefix.is_root() {
            return Some(self.clone());
        }
        let suffix = self
            .as_str()
            .strip_prefix(prefix.as_str())?
            .trim_start_matches('/');
        Some(Self(suffix.to_string()))
    }
}

impl fmt::Display for WorkspaceRelativePath {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl FromStr for WorkspaceRelativePath {
    type Err = WorkspacePathError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::parse(value)
    }
}

impl<'de> Deserialize<'de> for WorkspaceRelativePath {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::parse(value).map_err(serde::de::Error::custom)
    }
}

fn validate_entry_name(value: &str) -> Result<(), WorkspacePathError> {
    if value.is_empty() {
        return Err(WorkspacePathError::EmptyEntryName);
    }
    if value == "." {
        return Err(WorkspacePathError::CurrentDirectoryComponent);
    }
    if value == ".." {
        return Err(WorkspacePathError::ParentDirectoryComponent);
    }
    if value.contains('/') {
        return Err(WorkspacePathError::ForwardSlash);
    }
    if value.contains('\\') {
        return Err(WorkspacePathError::Backslash);
    }
    if value.chars().any(char::is_control) {
        return Err(WorkspacePathError::ControlCharacter);
    }
    if value
        .chars()
        .any(|character| matches!(character, '<' | '>' | ':' | '"' | '|' | '?' | '*'))
    {
        return Err(WorkspacePathError::PlatformForbiddenCharacter);
    }
    Ok(())
}

fn validate_relative_path(value: &str) -> Result<(), WorkspacePathError> {
    if value.is_empty() {
        return Ok(());
    }
    if value.starts_with('/') || looks_like_windows_absolute_path(value) {
        return Err(WorkspacePathError::Absolute);
    }
    if value.ends_with('/') {
        return Err(WorkspacePathError::TrailingSlash);
    }
    if value.contains('\\') {
        return Err(WorkspacePathError::Backslash);
    }
    if value.chars().any(char::is_control) {
        return Err(WorkspacePathError::ControlCharacter);
    }
    for component in value.split('/') {
        match component {
            "" => return Err(WorkspacePathError::EmptyComponent),
            "." => return Err(WorkspacePathError::CurrentDirectoryComponent),
            ".." => return Err(WorkspacePathError::ParentDirectoryComponent),
            _ => {}
        }
    }
    Ok(())
}

fn looks_like_windows_absolute_path(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':'
}

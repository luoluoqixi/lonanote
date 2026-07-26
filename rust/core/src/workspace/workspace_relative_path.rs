use std::{fmt, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize};
use thiserror::Error;

/// Workspace 内的逻辑相对路径。
///
/// 底层始终保存 UTF-8 `String`，对外只使用 `/` 作为分隔符。
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

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }

    pub fn is_root(&self) -> bool {
        self.0.is_empty()
    }

    pub fn components(&self) -> impl DoubleEndedIterator<Item = &str> {
        self.0.split('/').filter(|component| !component.is_empty())
    }

    pub fn file_name(&self) -> Option<&str> {
        self.components().next_back()
    }

    pub fn parent(&self) -> Option<Self> {
        if self.is_root() {
            return None;
        }

        match self.0.rsplit_once('/') {
            Some((parent, _)) => Some(Self(parent.to_string())),
            None => Some(Self::root()),
        }
    }

    pub fn join_name(&self, name: &WorkspaceEntryName) -> Self {
        if self.is_root() {
            return Self(name.as_str().to_string());
        }

        Self(format!("{}/{}", self.as_str(), name.as_str()))
    }

    /// 按路径 component 判断前缀，避免把 `note` 误认为 `notes/a` 的父级。
    pub fn starts_with(&self, other: &Self) -> bool {
        if other.is_root() {
            return true;
        }
        if self.0.len() < other.0.len() || !self.0.starts_with(other.as_str()) {
            return false;
        }

        self.0.len() == other.0.len() || self.0.as_bytes().get(other.0.len()).copied() == Some(b'/')
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

    pub fn join(&self, path: &Self) -> Self {
        if self.is_root() {
            return path.clone();
        }
        if path.is_root() {
            return self.clone();
        }

        Self(format!("{}/{}", self.as_str(), path.as_str()))
    }
}

impl fmt::Display for WorkspaceRelativePath {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl AsRef<str> for WorkspaceRelativePath {
    fn as_ref(&self) -> &str {
        self.as_str()
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

/// Workspace 中的单个文件或目录名称。
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct WorkspaceEntryName(String);

impl WorkspaceEntryName {
    pub fn parse(value: impl Into<String>) -> Result<Self, WorkspacePathError> {
        let value = value.into();
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
            return Err(WorkspacePathError::ForwardSlashInEntryName);
        }
        if value.contains('\\') {
            return Err(WorkspacePathError::Backslash);
        }
        if value.contains('\0') {
            return Err(WorkspacePathError::Nul);
        }

        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

impl fmt::Display for WorkspaceEntryName {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl FromStr for WorkspaceEntryName {
    type Err = WorkspacePathError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::parse(value)
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

fn validate_relative_path(value: &str) -> Result<(), WorkspacePathError> {
    if value.is_empty() {
        return Ok(());
    }
    if value.starts_with('/') {
        return Err(WorkspacePathError::Absolute);
    }
    if value.ends_with('/') {
        return Err(WorkspacePathError::TrailingSlash);
    }
    if value.contains('\\') {
        return Err(WorkspacePathError::Backslash);
    }
    if value.contains('\0') {
        return Err(WorkspacePathError::Nul);
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum WorkspacePathError {
    #[error("workspace 相对路径不能以 / 开头")]
    Absolute,
    #[error("workspace 相对路径不能以 / 结尾")]
    TrailingSlash,
    #[error("workspace 相对路径不能包含空 component 或连续的 //")]
    EmptyComponent,
    #[error("workspace 相对路径不能包含 . component")]
    CurrentDirectoryComponent,
    #[error("workspace 相对路径不能包含 .. component")]
    ParentDirectoryComponent,
    #[error("workspace 相对路径不能包含反斜杠")]
    Backslash,
    #[error("workspace 相对路径不能包含 NUL")]
    Nul,
    #[error("workspace entry name 不能为空")]
    EmptyEntryName,
    #[error("workspace entry name 不能包含 /")]
    ForwardSlashInEntryName,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_only_canonical_relative_paths() {
        for path in ["", "README.md", "notes/today.md", "assets/images/a.png"] {
            assert_eq!(WorkspaceRelativePath::parse(path).unwrap().as_str(), path);
        }

        for path in [
            "/notes/a.md",
            "notes\\a.md",
            "notes//a.md",
            "notes/../secret",
            "./README.md",
            "notes/",
            "notes/\0/a",
        ] {
            assert!(
                WorkspaceRelativePath::parse(path).is_err(),
                "{path:?} should be invalid"
            );
        }
    }

    #[test]
    fn deserialize_cannot_bypass_validation() {
        assert!(serde_json::from_str::<WorkspaceRelativePath>("\"notes/../secret\"").is_err());
        assert!(serde_json::from_str::<WorkspaceEntryName>("\"a/b\"").is_err());
        let path = WorkspaceRelativePath::parse("中文目录/笔记.md").unwrap();
        assert_eq!(
            serde_json::from_str::<WorkspaceRelativePath>(&serde_json::to_string(&path).unwrap())
                .unwrap(),
            path
        );
    }

    #[test]
    fn parent_join_and_prefix_are_component_aware() {
        let notes = WorkspaceRelativePath::parse("notes").unwrap();
        let note = WorkspaceRelativePath::parse("note").unwrap();
        let path = notes.join_name(&WorkspaceEntryName::parse("today.md").unwrap());

        assert_eq!(path.as_str(), "notes/today.md");
        assert_eq!(path.parent(), Some(notes.clone()));
        assert!(path.starts_with(&notes));
        assert!(!path.starts_with(&note));
        assert!(path.starts_with(&WorkspaceRelativePath::root()));
        assert_eq!(path.strip_prefix(&notes).unwrap().as_str(), "today.md");
        assert_eq!(notes.join(&path.strip_prefix(&notes).unwrap()), path);
    }
}

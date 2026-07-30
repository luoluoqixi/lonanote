use std::{fmt, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize};

use crate::workspace::error::{WorkspaceDirectoryNameError, WorkspacePathError};

/// Managed Storage 中的单个 Workspace 目录名。
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct WorkspaceDirectoryName(String);

impl WorkspaceDirectoryName {
    pub fn parse(value: impl Into<String>) -> Result<Self, WorkspaceDirectoryNameError> {
        let value = value.into();
        validate_directory_name(&value)?;
        if value.ends_with([' ', '.']) {
            return Err(WorkspaceDirectoryNameError::TrailingDotOrSpace);
        }
        let stem = value.split('.').next().unwrap_or_default();
        if is_windows_reserved_name(stem) {
            return Err(WorkspaceDirectoryNameError::ReservedName);
        }
        Ok(Self(value))
    }

    pub fn from_display_name(display_name: &str) -> Self {
        let mut output = String::new();
        let mut previous_was_separator = false;
        for character in display_name.trim().chars().take(80) {
            let invalid = character.is_control()
                || matches!(
                    character,
                    '/' | '\\' | '<' | '>' | ':' | '"' | '|' | '?' | '*'
                );
            if invalid {
                if !previous_was_separator && !output.is_empty() {
                    output.push('-');
                }
                previous_was_separator = true;
            } else {
                output.push(character);
                previous_was_separator = false;
            }
        }
        let output = output
            .trim_matches(|character| matches!(character, ' ' | '.' | '-'))
            .to_string();
        Self::parse(output).unwrap_or_else(|_| Self("Workspace".to_string()))
    }

    pub fn with_suffix(&self, suffix: usize) -> Self {
        Self(format!("{}-{suffix}", self.0))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for WorkspaceDirectoryName {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl FromStr for WorkspaceDirectoryName {
    type Err = WorkspaceDirectoryNameError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::parse(value)
    }
}

impl<'de> Deserialize<'de> for WorkspaceDirectoryName {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::parse(value).map_err(serde::de::Error::custom)
    }
}

fn validate_directory_name(value: &str) -> Result<(), WorkspaceDirectoryNameError> {
    if value.is_empty() {
        return Err(WorkspacePathError::EmptyEntryName.into());
    }
    if value == "." {
        return Err(WorkspacePathError::CurrentDirectoryComponent.into());
    }
    if value == ".." {
        return Err(WorkspacePathError::ParentDirectoryComponent.into());
    }
    if value.contains('/') {
        return Err(WorkspacePathError::ForwardSlash.into());
    }
    if value.contains('\\') {
        return Err(WorkspacePathError::Backslash.into());
    }
    if value.chars().any(char::is_control) {
        return Err(WorkspacePathError::ControlCharacter.into());
    }
    if value
        .chars()
        .any(|character| matches!(character, '<' | '>' | ':' | '"' | '|' | '?' | '*'))
    {
        return Err(WorkspacePathError::PlatformForbiddenCharacter.into());
    }
    Ok(())
}

fn is_windows_reserved_name(value: &str) -> bool {
    matches!(
        value.to_ascii_uppercase().as_str(),
        "CON"
            | "PRN"
            | "AUX"
            | "NUL"
            | "COM1"
            | "COM2"
            | "COM3"
            | "COM4"
            | "COM5"
            | "COM6"
            | "COM7"
            | "COM8"
            | "COM9"
            | "LPT1"
            | "LPT2"
            | "LPT3"
            | "LPT4"
            | "LPT5"
            | "LPT6"
            | "LPT7"
            | "LPT8"
            | "LPT9"
    )
}

use std::{fmt, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize, Serializer};
use uuid::Uuid;

use crate::workspace::error::{StorageProviderIdError, WorkspaceIdError};

/// Workspace 的稳定唯一身份。路径、名称和 StorageBinding 变化时 ID 不变。
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct WorkspaceId(Uuid);

// Workspace 身份不能通过 Default 静默生成，必须在显式创建流程中调用 new。
#[allow(clippy::new_without_default)]
impl WorkspaceId {
    pub fn new() -> Self {
        Self(Uuid::new_v4())
    }

    pub fn parse(value: impl AsRef<str>) -> Result<Self, WorkspaceIdError> {
        let value = value.as_ref();
        if value.is_empty() {
            return Err(WorkspaceIdError::Empty);
        }
        let uuid = Uuid::parse_str(value).map_err(|_| WorkspaceIdError::InvalidFormat)?;
        if uuid.hyphenated().to_string() != value {
            return Err(WorkspaceIdError::NotCanonical);
        }
        Ok(Self(uuid))
    }

    pub fn as_uuid(&self) -> &Uuid {
        &self.0
    }
}

impl fmt::Display for WorkspaceId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}", self.0.hyphenated())
    }
}

impl FromStr for WorkspaceId {
    type Err = WorkspaceIdError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::parse(value)
    }
}

impl Serialize for WorkspaceId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl<'de> Deserialize<'de> for WorkspaceId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::parse(value).map_err(serde::de::Error::custom)
    }
}

/// Storage Provider 的稳定标识。Core 不把平台 Provider 硬编码为 enum。
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct StorageProviderId(String);

impl StorageProviderId {
    pub fn parse(value: impl Into<String>) -> Result<Self, StorageProviderIdError> {
        let value = value.into();
        if value.is_empty() {
            return Err(StorageProviderIdError::Empty);
        }
        if value.trim() != value {
            return Err(StorageProviderIdError::SurroundingWhitespace);
        }
        if value.chars().any(char::is_control) {
            return Err(StorageProviderIdError::ControlCharacter);
        }
        if value.to_lowercase() != value {
            return Err(StorageProviderIdError::NotLowercase);
        }
        if !value.chars().all(|character| {
            character.is_ascii_lowercase()
                || character.is_ascii_digit()
                || matches!(character, '-' | '_' | '.')
        }) {
            return Err(StorageProviderIdError::InvalidCharacter);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for StorageProviderId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl FromStr for StorageProviderId {
    type Err = StorageProviderIdError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::parse(value)
    }
}

impl<'de> Deserialize<'de> for StorageProviderId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::parse(value).map_err(serde::de::Error::custom)
    }
}

use std::{fmt, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize};
use thiserror::Error;
use uuid::Uuid;

/// Workspace 的稳定身份。
///
/// 路径、名称和挂载点变化时，这个 ID 都不会变化。
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct WorkspaceId(String);

impl WorkspaceId {
    /// 为新 Workspace 生成 UUID v4。
    pub fn new() -> Self {
        Self(Uuid::new_v4().hyphenated().to_string())
    }

    /// 解析 canonical UUID 字符串。
    pub fn parse(value: impl Into<String>) -> Result<Self, WorkspaceIdError> {
        let value = value.into();
        if value.is_empty() {
            return Err(WorkspaceIdError::Empty);
        }

        let uuid = Uuid::parse_str(&value).map_err(|_| WorkspaceIdError::InvalidFormat)?;
        if uuid.hyphenated().to_string() != value {
            return Err(WorkspaceIdError::NotCanonical);
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

impl Default for WorkspaceId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for WorkspaceId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl AsRef<str> for WorkspaceId {
    fn as_ref(&self) -> &str {
        self.as_str()
    }
}

impl FromStr for WorkspaceId {
    type Err = WorkspaceIdError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::parse(value)
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

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum WorkspaceIdError {
    #[error("workspace ID 不能为空")]
    Empty,
    #[error("workspace ID 不是合法 UUID")]
    InvalidFormat,
    #[error("workspace ID 必须使用小写、带连字符的 canonical UUID 格式")]
    NotCanonical,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_id_is_uuid_v4_and_canonical() {
        let id = WorkspaceId::new();
        let uuid = Uuid::parse_str(id.as_str()).expect("parse generated ID");

        assert_eq!(uuid.get_version_num(), 4);
        assert_eq!(uuid.hyphenated().to_string(), id.as_str());
    }

    #[test]
    fn parse_rejects_non_canonical_values() {
        assert_eq!(WorkspaceId::parse("").unwrap_err(), WorkspaceIdError::Empty);
        assert_eq!(
            WorkspaceId::parse("not-a-uuid").unwrap_err(),
            WorkspaceIdError::InvalidFormat
        );
        assert_eq!(
            WorkspaceId::parse("2FF87F15-BF7E-4E93-AEB5-50ED32627F51").unwrap_err(),
            WorkspaceIdError::NotCanonical
        );
    }

    #[test]
    fn deserialize_uses_the_same_validation() {
        let error = serde_json::from_str::<WorkspaceId>("\"2FF87F15-BF7E-4E93-AEB5-50ED32627F51\"")
            .unwrap_err();

        assert!(error.to_string().contains("canonical UUID"));
    }
}

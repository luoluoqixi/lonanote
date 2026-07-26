use std::{fmt, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize)]
#[serde(transparent)]
pub struct StorageMountId(String);

impl StorageMountId {
    pub fn parse(value: impl Into<String>) -> Result<Self, StorageMountIdError> {
        let value = value.into();
        if value.trim().is_empty() {
            return Err(StorageMountIdError::Empty);
        }
        if value != value.trim() || value.chars().any(char::is_control) {
            return Err(StorageMountIdError::InvalidCharacter);
        }
        Ok(Self(value))
    }

    pub fn new_user_mount() -> Self {
        Self(format!("mount:{}", Uuid::new_v4().hyphenated()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for StorageMountId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl FromStr for StorageMountId {
    type Err = StorageMountIdError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::parse(value)
    }
}

impl<'de> Deserialize<'de> for StorageMountId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::parse(value).map_err(serde::de::Error::custom)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum StorageMountKind {
    DesktopAbsolute { base_path: String },
    DesktopDocuments,
    IosAppDocuments,
    IosICloud { container_id: String },
    IosBookmark { bookmark_ref: String },
    AndroidAppInternal,
    AndroidDocumentTree { grant_ref: String },
}

impl StorageMountKind {
    pub fn is_same_type(&self, other: &Self) -> bool {
        matches!(
            (self, other),
            (Self::DesktopAbsolute { .. }, Self::DesktopAbsolute { .. })
                | (Self::DesktopDocuments, Self::DesktopDocuments)
                | (Self::IosAppDocuments, Self::IosAppDocuments)
                | (Self::IosICloud { .. }, Self::IosICloud { .. })
                | (Self::IosBookmark { .. }, Self::IosBookmark { .. })
                | (Self::AndroidAppInternal, Self::AndroidAppInternal)
                | (
                    Self::AndroidDocumentTree { .. },
                    Self::AndroidDocumentTree { .. }
                )
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageMountRecord {
    pub id: StorageMountId,
    pub display_name: String,
    pub kind: StorageMountKind,
    pub created_time: u64,
}

impl StorageMountRecord {
    pub fn validate(&self) -> Result<(), StorageMountValidationError> {
        if self.display_name.trim().is_empty() {
            return Err(StorageMountValidationError::EmptyDisplayName);
        }
        match &self.kind {
            StorageMountKind::DesktopAbsolute { base_path } if base_path.trim().is_empty() => {
                Err(StorageMountValidationError::EmptyDesktopAbsolutePath)
            }
            StorageMountKind::IosBookmark { bookmark_ref } if bookmark_ref.trim().is_empty() => {
                Err(StorageMountValidationError::EmptyBookmarkRef)
            }
            StorageMountKind::AndroidDocumentTree { grant_ref } if grant_ref.trim().is_empty() => {
                Err(StorageMountValidationError::EmptyGrantRef)
            }
            _ => Ok(()),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StorageAvailability {
    Available,
    Offline,
    NotDownloaded,
    AuthorizationRequired,
    AuthorizationRevoked,
    VolumeUnavailable,
    ProviderUnavailable,
    NotFound,
    Unsupported,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageMountStatus {
    pub mount_id: StorageMountId,
    pub availability: StorageAvailability,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub capabilities: Option<super::storage::StorageCapabilities>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum StorageMountValidationError {
    #[error("storage mount display name 不能为空")]
    EmptyDisplayName,
    #[error("DesktopAbsolute mount 的绝对路径不能为空")]
    EmptyDesktopAbsolutePath,
    #[error("IosBookmark mount 的 bookmark ref 不能为空")]
    EmptyBookmarkRef,
    #[error("AndroidDocumentTree mount 的 grant ref 不能为空")]
    EmptyGrantRef,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum StorageMountIdError {
    #[error("storage mount ID 不能为空")]
    Empty,
    #[error("storage mount ID 不能包含首尾空白或控制字符")]
    InvalidCharacter,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mount_id_deserialization_is_validated() {
        assert!(serde_json::from_str::<StorageMountId>("\"\"").is_err());
        assert!(serde_json::from_str::<StorageMountId>("\" mount\"").is_err());
        assert_eq!(
            serde_json::from_str::<StorageMountId>("\"desktop-documents\"")
                .unwrap()
                .as_str(),
            "desktop-documents"
        );
    }

    #[test]
    fn platform_reference_mounts_require_non_empty_values() {
        let record = StorageMountRecord {
            id: StorageMountId::parse("custom").unwrap(),
            display_name: "Custom".to_string(),
            kind: StorageMountKind::DesktopAbsolute {
                base_path: " ".to_string(),
            },
            created_time: 1,
        };
        assert_eq!(
            record.validate(),
            Err(StorageMountValidationError::EmptyDesktopAbsolutePath)
        );
    }

    #[test]
    fn platform_mount_payloads_round_trip_without_treating_refs_as_paths() {
        for kind in [
            StorageMountKind::DesktopAbsolute {
                base_path: "/selected/full/path".to_string(),
            },
            StorageMountKind::IosBookmark {
                bookmark_ref: "bookmark-record-key".to_string(),
            },
            StorageMountKind::AndroidDocumentTree {
                grant_ref: "persisted-uri-permission-key".to_string(),
            },
        ] {
            let json = serde_json::to_string(&kind).unwrap();
            assert_eq!(
                serde_json::from_str::<StorageMountKind>(&json).unwrap(),
                kind
            );
        }
    }
}

use std::{fmt, str::FromStr};

use serde::{Deserialize, Deserializer, Serialize, Serializer};

use crate::workspace::error::{StorageResourceIdentityError, StorageResourceRefError};

use super::{StorageProviderId, WorkspaceDirectoryName};

/// 由 Storage Provider 解释的持久化资源引用。
///
/// 普通文件系统使用绝对路径；未来平台可以使用 bookmark、SAF URI 或安全存储中的引用 ID。
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct StorageResourceRef(String);

impl StorageResourceRef {
    pub fn parse(value: impl Into<String>) -> Result<Self, StorageResourceRefError> {
        let value = value.into();
        if value.trim().is_empty() {
            return Err(StorageResourceRefError::Empty);
        }
        if value.chars().any(char::is_control) {
            return Err(StorageResourceRefError::ControlCharacter);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for StorageResourceRef {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl FromStr for StorageResourceRef {
    type Err = StorageResourceRefError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::parse(value)
    }
}

impl Serialize for StorageResourceRef {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for StorageResourceRef {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = String::deserialize(deserializer)?;
        Self::parse(value).map_err(serde::de::Error::custom)
    }
}

/// Provider 为底层资源生成的稳定身份，仅用于比较两个 Binding 是否指向同一资源。
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct StorageResourceIdentity(String);

impl StorageResourceIdentity {
    pub fn parse(value: impl Into<String>) -> Result<Self, StorageResourceIdentityError> {
        let value = value.into();
        if value.trim().is_empty() {
            return Err(StorageResourceIdentityError::Empty);
        }
        if value.chars().any(char::is_control) {
            return Err(StorageResourceIdentityError::ControlCharacter);
        }
        Ok(Self(value))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for StorageResourceIdentity {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl FromStr for StorageResourceIdentity {
    type Err = StorageResourceIdentityError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Self::parse(value)
    }
}

impl Serialize for StorageResourceIdentity {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for StorageResourceIdentity {
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
pub enum WorkspaceStorageBinding {
    Managed {
        provider_id: StorageProviderId,
        provider_schema_version: u32,
        directory_name: WorkspaceDirectoryName,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        resource_identity: Option<StorageResourceIdentity>,
    },
    External {
        provider_id: StorageProviderId,
        provider_schema_version: u32,
        resource_ref: StorageResourceRef,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        resource_identity: Option<StorageResourceIdentity>,
    },
}

impl WorkspaceStorageBinding {
    pub fn provider_id(&self) -> &StorageProviderId {
        match self {
            Self::Managed { provider_id, .. } | Self::External { provider_id, .. } => provider_id,
        }
    }

    pub fn provider_schema_version(&self) -> u32 {
        match self {
            Self::Managed {
                provider_schema_version,
                ..
            }
            | Self::External {
                provider_schema_version,
                ..
            } => *provider_schema_version,
        }
    }

    pub fn resource_identity(&self) -> Option<&StorageResourceIdentity> {
        match self {
            Self::Managed {
                resource_identity, ..
            }
            | Self::External {
                resource_identity, ..
            } => resource_identity.as_ref(),
        }
    }

    pub fn with_resource_identity(mut self, identity: StorageResourceIdentity) -> Self {
        match &mut self {
            Self::Managed {
                resource_identity, ..
            }
            | Self::External {
                resource_identity, ..
            } => *resource_identity = Some(identity),
        }
        self
    }

    /// 判断两个已解析 Binding 是否指向同一个 Provider 资源。
    pub fn same_resource(&self, other: &Self) -> bool {
        self.provider_id() == other.provider_id()
            && self
                .resource_identity()
                .zip(other.resource_identity())
                .is_some_and(|(left, right)| left == right)
    }

    /// 判断两个 Binding 是否使用完全相同的定位引用，忽略解析后的 resource identity。
    pub fn same_reference(&self, other: &Self) -> bool {
        match (self, other) {
            (
                Self::Managed {
                    provider_id: left_provider,
                    provider_schema_version: left_version,
                    directory_name: left_directory,
                    ..
                },
                Self::Managed {
                    provider_id: right_provider,
                    provider_schema_version: right_version,
                    directory_name: right_directory,
                    ..
                },
            ) => {
                left_provider == right_provider
                    && left_version == right_version
                    && left_directory == right_directory
            }
            (
                Self::External {
                    provider_id: left_provider,
                    provider_schema_version: left_version,
                    resource_ref: left_reference,
                    ..
                },
                Self::External {
                    provider_id: right_provider,
                    provider_schema_version: right_version,
                    resource_ref: right_reference,
                    ..
                },
            ) => {
                left_provider == right_provider
                    && left_version == right_version
                    && left_reference == right_reference
            }
            _ => false,
        }
    }

    pub fn is_managed(&self) -> bool {
        matches!(self, Self::Managed { .. })
    }
}

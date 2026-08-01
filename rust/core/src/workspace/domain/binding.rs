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

/// Provider 为存储目标或访问范围生成的稳定身份，用于比较两个 Binding 是否等价。
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

/// Provider 定位 Workspace 资源所需的数据。
///
/// Managed 与 External 只在定位方式上存在差异，因此由请求态和已解析态共享。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum WorkspaceStorageLocation {
    Managed {
        directory_name: WorkspaceDirectoryName,
    },
    External {
        resource_ref: StorageResourceRef,
    },
}

impl WorkspaceStorageLocation {
    pub fn is_managed(&self) -> bool {
        matches!(self, Self::Managed { .. })
    }
}

/// 尚未由 Storage Resolver 解析的 Binding 请求。
///
/// 该类型只作为 API、Manager 与 Resolver 之间的临时输入，不能写入 Catalog。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStorageBindingRequest {
    pub provider_id: StorageProviderId,
    pub provider_schema_version: u32,
    #[serde(flatten)]
    pub location: WorkspaceStorageLocation,
}

impl WorkspaceStorageBindingRequest {
    pub fn resolve(self, resource_identity: StorageResourceIdentity) -> WorkspaceStorageBinding {
        WorkspaceStorageBinding {
            provider_id: self.provider_id,
            provider_schema_version: self.provider_schema_version,
            location: self.location,
            resource_identity,
        }
    }

    pub fn is_managed(&self) -> bool {
        self.location.is_managed()
    }
}

/// 已由 Storage Resolver 解析、可以持久化到 Catalog 的 Binding。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStorageBinding {
    pub provider_id: StorageProviderId,
    pub provider_schema_version: u32,
    #[serde(flatten)]
    pub location: WorkspaceStorageLocation,
    pub resource_identity: StorageResourceIdentity,
}

impl WorkspaceStorageBinding {
    pub fn to_request(&self) -> WorkspaceStorageBindingRequest {
        WorkspaceStorageBindingRequest {
            provider_id: self.provider_id.clone(),
            provider_schema_version: self.provider_schema_version,
            location: self.location.clone(),
        }
    }

    /// 判断两个已解析 Binding 是否代表同一个 Provider 存储目标或访问范围。
    pub fn same_resource(&self, other: &Self) -> bool {
        self.provider_id == other.provider_id && self.resource_identity == other.resource_identity
    }

    /// 判断两个 Binding 是否使用完全相同的定位引用，忽略解析后的 resource identity。
    pub fn same_reference(&self, other: &Self) -> bool {
        self.provider_id == other.provider_id
            && self.provider_schema_version == other.provider_schema_version
            && self.location == other.location
    }

    pub fn is_managed(&self) -> bool {
        self.location.is_managed()
    }
}

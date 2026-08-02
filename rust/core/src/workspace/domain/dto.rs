use serde::{Deserialize, Serialize};

use super::{
    StorageProviderId, WorkspaceDirectoryName, WorkspaceId, WorkspaceRecord, WorkspaceSettings,
    WorkspaceStorageBinding, WorkspaceStorageBindingRequest,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WorkspaceAvailability {
    Unknown,
    Available,
    NotFound,
    AuthorizationRequired,
    AuthorizationRevoked,
    ProviderUnavailable,
    Offline,
    NotDownloaded,
    VolumeUnavailable,
    InvalidManifest,
    WorkspaceIdMismatch,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WorkspaceRuntimeStatus {
    Open,
    Closed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WorkspaceStorageKindView {
    Managed,
    External,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStorageView {
    pub kind: WorkspaceStorageKindView,
    pub provider_id: StorageProviderId,
    pub directory_name: Option<WorkspaceDirectoryName>,
}

impl From<&WorkspaceStorageBinding> for WorkspaceStorageView {
    fn from(binding: &WorkspaceStorageBinding) -> Self {
        match &binding.location {
            super::WorkspaceStorageLocation::Managed { directory_name } => Self {
                kind: WorkspaceStorageKindView::Managed,
                provider_id: binding.provider_id.clone(),
                directory_name: Some(directory_name.clone()),
            },
            super::WorkspaceStorageLocation::External { .. } => Self {
                kind: WorkspaceStorageKindView::External,
                provider_id: binding.provider_id.clone(),
                directory_name: None,
            },
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
    pub id: WorkspaceId,
    pub display_name: String,
    pub storage: WorkspaceStorageView,
    pub settings: WorkspaceSettings,
    pub status: WorkspaceRuntimeStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceListItem {
    pub id: WorkspaceId,
    pub display_name: String,
    pub created_at: Option<u64>,
    pub last_opened_at: Option<u64>,
    pub storage_kind: WorkspaceStorageKindView,
    pub availability: WorkspaceAvailability,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachWorkspaceResult {
    pub id: WorkspaceId,
    pub display_name: String,
    pub storage: WorkspaceStorageView,
}

impl From<&WorkspaceRecord> for AttachWorkspaceResult {
    fn from(record: &WorkspaceRecord) -> Self {
        Self {
            id: record.id,
            display_name: record.cached_summary.display_name.clone(),
            storage: WorkspaceStorageView::from(&record.storage_binding),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum WorkspaceStorageTarget {
    Managed {
        provider_id: StorageProviderId,
        preferred_directory_name: WorkspaceDirectoryName,
    },
    External {
        binding: WorkspaceStorageBindingRequest,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum StorageCleanupStatus {
    Retained,
    Removed,
    Failed { message: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveWorkspaceResult {
    pub workspace_id: WorkspaceId,
    pub storage: WorkspaceStorageView,
    pub file_cleanup: StorageCleanupStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelocateWorkspaceResult {
    pub workspace_id: WorkspaceId,
    pub source_storage: WorkspaceStorageView,
    pub target_storage: WorkspaceStorageView,
    pub source_cleanup: StorageCleanupStatus,
}

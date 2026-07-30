use serde::{Deserialize, Serialize};

use super::{
    StorageProviderId, WorkspaceDirectoryName, WorkspaceId, WorkspaceRecord, WorkspaceSettings,
    WorkspaceStorageBinding,
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
        match binding {
            WorkspaceStorageBinding::Managed {
                provider_id,
                directory_name,
            } => Self {
                kind: WorkspaceStorageKindView::Managed,
                provider_id: provider_id.clone(),
                directory_name: Some(directory_name.clone()),
            },
            WorkspaceStorageBinding::External { provider_id, .. } => Self {
                kind: WorkspaceStorageKindView::External,
                provider_id: provider_id.clone(),
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
    pub storage_kind: WorkspaceStorageKindView,
    pub availability: WorkspaceAvailability,
    pub last_opened_at: Option<u64>,
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
        binding: WorkspaceStorageBinding,
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
    pub removed_record: WorkspaceRecord,
    pub file_cleanup: StorageCleanupStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelocateWorkspaceResult {
    pub workspace_id: WorkspaceId,
    pub source_binding: WorkspaceStorageBinding,
    pub target_binding: WorkspaceStorageBinding,
    pub source_cleanup: StorageCleanupStatus,
}

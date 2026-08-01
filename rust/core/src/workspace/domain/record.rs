use serde::{Deserialize, Serialize};

use super::{WorkspaceId, WorkspaceStorageBinding};

pub const WORKSPACE_CATALOG_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceCachedSummary {
    pub display_name: String,
    pub created_at: Option<u64>,
    pub last_validated_at: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecord {
    pub id: WorkspaceId,
    pub storage_binding: WorkspaceStorageBinding,
    pub cached_summary: WorkspaceCachedSummary,
}

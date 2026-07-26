use serde::{Deserialize, Serialize};

use super::{workspace_id::WorkspaceId, workspace_settings::WorkspaceSettings};

pub const WORKSPACE_MANIFEST_SCHEMA_VERSION: u32 = 2;

/// 保存在 `.lonanote/workspace.json` 中的 Workspace 权威身份与设置。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceManifest {
    pub schema_version: u32,
    pub id: WorkspaceId,
    pub create_time: u64,
    #[serde(default)]
    pub settings: WorkspaceSettings,
}

impl WorkspaceManifest {
    pub fn new(id: WorkspaceId, create_time: u64) -> Self {
        Self {
            schema_version: WORKSPACE_MANIFEST_SCHEMA_VERSION,
            id,
            create_time,
            settings: WorkspaceSettings::default(),
        }
    }
}

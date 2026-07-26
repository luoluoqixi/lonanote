use serde::{Deserialize, Serialize};

use super::{workspace_id::WorkspaceId, workspace_relative_path::WorkspaceRelativePath};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSaveData {
    pub id: WorkspaceId,
    /// 上次打开的文件路径。
    pub last_open_file_path: Option<WorkspaceRelativePath>,
}

impl WorkspaceSaveData {
    pub fn new(id: WorkspaceId) -> Self {
        Self {
            id,
            last_open_file_path: None,
        }
    }
}

use serde::{Deserialize, Serialize};

use super::{storage_mount::StorageMountId, workspace_relative_path::WorkspaceRelativePath};

/// Workspace 的持久位置。
///
/// locator 只描述 mount 与 mount 内相对路径，不缓存解析后的绝对路径。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceLocator {
    pub mount_id: StorageMountId,
    pub relative_path: WorkspaceRelativePath,
}

impl WorkspaceLocator {
    pub fn new(mount_id: StorageMountId, relative_path: WorkspaceRelativePath) -> Self {
        Self {
            mount_id,
            relative_path,
        }
    }
}

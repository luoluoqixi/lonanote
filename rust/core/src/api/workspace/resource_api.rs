use cmdreg::command;

use crate::workspace::{workspace_manager, WorkspaceId, WorkspaceResourceScope};

/// 返回仅用于 WebView resource endpoint 的可撤销 capability，不包含资源内容。
#[command("workspace.resource")]
async fn acquire_scope(workspace_id: WorkspaceId) -> anyhow::Result<WorkspaceResourceScope> {
    Ok(workspace_manager()
        .acquire_resource_scope(&workspace_id)
        .await?)
}

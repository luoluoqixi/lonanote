use cmdreg::command;

use crate::workspace::{
    workspace_manager, WorkspaceHistorySnapshot, WorkspaceId, WorkspaceRelativePath,
};

#[command("workspace.history")]
async fn list(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
) -> anyhow::Result<Vec<WorkspaceHistorySnapshot>> {
    Ok(workspace_manager()
        .list_history(&workspace_id, &path)
        .await?)
}

#[command("workspace.history")]
async fn read(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
    snapshot_id: String,
) -> anyhow::Result<String> {
    Ok(workspace_manager()
        .read_history(&workspace_id, &path, &snapshot_id)
        .await?)
}

#[command("workspace.history")]
async fn restore(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
    snapshot_id: String,
) -> anyhow::Result<()> {
    Ok(workspace_manager()
        .restore_history(&workspace_id, &path, &snapshot_id)
        .await?)
}

use crate::workspace::{
    workspace_manager, WorkspaceDirectorySnapshot, WorkspaceId, WorkspaceRelativePath,
};
use cmdreg::command;
#[command("workspace.index")]
async fn get_directory(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
    reload: bool,
) -> anyhow::Result<WorkspaceDirectorySnapshot> {
    Ok(workspace_manager()
        .get_directory(&workspace_id, &path, reload)
        .await?)
}
/// 只失效缓存，不触发 Storage 读取；可见目录重读由 Explorer 编排。
#[command("workspace.index")]
async fn refresh(workspace_id: WorkspaceId) -> anyhow::Result<()> {
    Ok(workspace_manager().refresh_index(&workspace_id).await?)
}

use cmdreg::command;

use crate::workspace::{
    file_tree::{FileNode, FileTree},
    workspace_manager, WorkspaceId, WorkspaceRelativePath,
};

#[command("workspace.index")]
async fn get_tree(workspace_id: WorkspaceId, recursive: bool) -> anyhow::Result<FileTree> {
    Ok(workspace_manager()
        .get_tree(&workspace_id, recursive)
        .await?)
}

#[command("workspace.index")]
async fn get_node(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
    recursive: bool,
) -> anyhow::Result<FileNode> {
    Ok(workspace_manager()
        .get_node(&workspace_id, &path, recursive)
        .await?)
}

#[command("workspace.index")]
async fn refresh(workspace_id: WorkspaceId) -> anyhow::Result<()> {
    Ok(workspace_manager().refresh_index(&workspace_id).await?)
}

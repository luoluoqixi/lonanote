use anyhow::{anyhow, Result};
use cmdreg::command;

use crate::workspace::{
    file_tree::{FileNode, FileTreeSortType},
    get_workspace_manager, get_workspace_manager_mut,
    workspace_path::WorkspacePath,
    workspace_settings::WorkspaceSettings,
};

#[command("workspace")]
async fn import_init_workspace(path: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;

    workspace_manager
        .import_init_data(&WorkspacePath::from(&path))
        .await
        .map_err(|err| {
            anyhow!(
                "workspace import_init_workspace error: {}, path: {}",
                err,
                &path,
            )
        })?;

    Ok(())
}

#[command("workspace")]
async fn is_open_workspace(path: String) -> Result<bool> {
    let workspace_manager = get_workspace_manager().await;
    let is_open = workspace_manager
        .get_workspace(&WorkspacePath::from(&path))
        .is_some();

    Ok(is_open)
}

#[command("workspace")]
async fn get_open_workspace(path: String) -> Result<serde_json::Value> {
    let workspace_manager = get_workspace_manager().await;
    let wp = WorkspacePath::from(&path);
    let workspace = workspace_manager
        .get_workspace(&wp)
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    let metadata = workspace_manager.get_workspace_metadata(&wp);

    let ws = serde_json::json!({
        "settings": &workspace.settings,
        "metadata": &metadata,
    });

    Ok(ws)
}

#[command("workspace")]
async fn set_open_workspace_settings(path: String, settings: WorkspaceSettings) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    workspace.set_settings(settings).await?;

    Ok(())
}

#[command("workspace")]
async fn get_open_workspace_settings(path: String) -> Result<serde_json::Value> {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;

    Ok(serde_json::json!(&workspace.settings))
}

#[command("workspace")]
async fn get_open_workspace_file_tree(path: String) -> Result<serde_json::Value> {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;

    let index = workspace.get_workspace_index().await;
    Ok(serde_json::json!(&index.file_tree))
}

#[command("workspace")]
async fn get_open_workspace_file_node(
    path: String,
    node_path: Option<String>,
    sort_type: FileTreeSortType,
    recursive: bool,
) -> Result<FileNode> {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;

    let node = workspace
        .get_node(node_path.as_ref(), sort_type, recursive)
        .await
        .map_err(|err| {
            anyhow!(
                "workspace get_node error: {}, path: {}, {:?}",
                err,
                &path,
                &node_path
            )
        })?;

    Ok(node)
}

#[command("workspace")]
async fn set_open_workspace_file_tree_sort_type(
    path: String,
    sort_type: FileTreeSortType,
) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    workspace.set_file_tree_sort_type(sort_type).await?;

    Ok(())
}

#[command("workspace")]
async fn set_open_workspace_follow_gitignore(path: String, follow_gitignore: bool) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    workspace.set_follow_gitignore(follow_gitignore).await?;

    Ok(())
}

#[command("workspace")]
async fn set_open_workspace_custom_ignore(path: String, custom_ignore: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    workspace.set_custom_ignore(custom_ignore).await?;

    Ok(())
}

#[command("workspace")]
async fn reset_open_workspace_custom_ignore(path: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    workspace.reset_custom_ignore().await?;

    Ok(())
}

#[command("workspace")]
async fn call_open_workspace_reinit(path: String) -> Result<()> {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    workspace.reinit().await?;

    Ok(())
}

#[command("workspace")]
async fn reset_open_workspace_histroy_snapshoot_count(path: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    workspace.reset_histroy_snapshoot_count().await?;

    Ok(())
}

#[command("workspace")]
async fn reset_open_workspace_upload_attachment_path(path: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    workspace.reset_upload_attachment_path().await?;

    Ok(())
}

#[command("workspace")]
async fn reset_open_workspace_upload_image_path(path: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&path))
        .ok_or(anyhow!("workspace is not open: {}", &path))?;
    workspace.reset_upload_image_path().await?;

    Ok(())
}

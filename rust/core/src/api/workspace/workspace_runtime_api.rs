use anyhow::{anyhow, Result};
use cmdreg::command;
use std::sync::Arc;

use crate::workspace::{
    file_tree::{FileNode, FileTreeSortType},
    get_workspace_registry, get_workspace_registry_mut, get_workspace_runtime,
    get_workspace_runtime_mut,
    workspace_instance::WorkspaceInstance,
    workspace_path::WorkspacePath,
};

async fn get_open_workspace_or_err(workspace_id: &str) -> Result<Arc<WorkspaceInstance>> {
    let workspace_runtime = get_workspace_runtime().await;
    workspace_runtime
        .get_open_workspace(workspace_id)
        .ok_or(anyhow!("workspace is not open: {}", workspace_id))
}

#[command("workspace.runtime")]
async fn import_init_workspace(path: String) -> Result<()> {
    let workspace_registry = get_workspace_registry().await;

    workspace_registry
        .import_init_data(&WorkspacePath::from(&path))
        .map_err(|err| {
            anyhow!(
                "workspace import_init_workspace error: {}, path: {}",
                err,
                &path,
            )
        })?;

    Ok(())
}

#[command("workspace.runtime")]
async fn is_workspace_open(workspace_id: String) -> Result<bool> {
    let workspace_runtime = get_workspace_runtime().await;
    Ok(workspace_runtime.is_workspace_open(&workspace_id))
}

#[command("workspace.runtime")]
async fn open_workspace(workspace_id: String) -> Result<serde_json::Value> {
    let (workspace_path, settings) = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry.prepare_workspace_open(&workspace_id)?
    };

    let (workspace, should_reinit) = {
        let mut workspace_runtime = get_workspace_runtime_mut().await;
        workspace_runtime.open_workspace(&workspace_id, &workspace_path, &settings)?
    };

    if should_reinit {
        workspace.reinit().await?;
    }

    Ok(serde_json::json!(workspace.snapshot().await))
}

#[command("workspace.runtime")]
async fn close_workspace(workspace_id: String) -> Result<()> {
    let workspace = {
        let mut workspace_runtime = get_workspace_runtime_mut().await;
        workspace_runtime.close_workspace(&workspace_id)
    };

    if let Some(workspace) = workspace {
        workspace.unload().await?;
    }

    Ok(())
}

#[command("workspace.runtime")]
async fn get_open_workspace(workspace_id: String) -> Result<serde_json::Value> {
    let workspace = get_open_workspace_or_err(&workspace_id).await?;

    let (record, settings) = {
        let workspace_registry = get_workspace_registry().await;
        let record = workspace_registry
            .get_workspace_record(&workspace_id)
            .cloned()
            .ok_or(anyhow!("workspace is not found: {}", &workspace_id))?;
        let settings = workspace_registry.get_workspace_settings(&workspace_id)?;
        (record, settings)
    };

    Ok(serde_json::json!({
        "record": record,
        "settings": settings,
        "runtimeConfig": workspace.get_runtime_config().await,
    }))
}

#[command("workspace.runtime")]
async fn get_open_workspace_file_tree(workspace_id: String) -> Result<serde_json::Value> {
    let workspace = get_open_workspace_or_err(&workspace_id).await?;
    let index = workspace.get_workspace_index().await;
    Ok(serde_json::json!(&index.file_tree))
}

#[command("workspace.runtime")]
async fn get_open_workspace_file_node(
    workspace_id: String,
    node_path: Option<String>,
    sort_type: FileTreeSortType,
    recursive: bool,
) -> Result<FileNode> {
    let workspace = get_open_workspace_or_err(&workspace_id).await?;

    let node = workspace
        .get_node(node_path.as_ref(), sort_type, recursive)
        .await
        .map_err(|err| {
            anyhow!(
                "workspace get_node error: {}, workspace_id: {}, {:?}",
                err,
                &workspace_id,
                &node_path
            )
        })?;

    Ok(node)
}

#[command("workspace.runtime")]
async fn call_open_workspace_reinit(workspace_id: String) -> Result<()> {
    let workspace = get_open_workspace_or_err(&workspace_id).await?;
    workspace.reinit().await?;

    Ok(())
}

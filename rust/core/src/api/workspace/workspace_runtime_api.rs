use anyhow::{anyhow, Result};
use cmdreg::command;
use serde::Serialize;
use std::sync::Arc;

use crate::workspace::{
    file_tree::{FileNode, FileTreeSortType},
    get_workspace_registry, get_workspace_registry_mut, get_workspace_runtime,
    get_workspace_runtime_mut,
    workspace_instance::{WorkspaceInstance, WorkspaceRuntimeConfig, WorkspaceRuntimeStatus},
    workspace_path::WorkspacePath,
    workspace_registry::WorkspaceRecord,
    workspace_settings::WorkspaceSettings,
};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceStateSnapshot {
    record: WorkspaceRecord,
    settings: WorkspaceSettings,
    runtime_config: WorkspaceRuntimeConfig,
    runtime_status: WorkspaceRuntimeStatus,
}

async fn get_open_workspace_or_err(workspace_id: &str) -> Result<Arc<WorkspaceInstance>> {
    let workspace_runtime = get_workspace_runtime().await;
    workspace_runtime
        .get_open_workspace(workspace_id)
        .ok_or(anyhow!("workspace is not open: {}", workspace_id))
}

async fn cleanup_failed_workspace_open(workspace_id: &str) {
    let workspace = {
        let mut workspace_runtime = get_workspace_runtime_mut().await;
        workspace_runtime.close_workspace(workspace_id)
    };

    if let Some(workspace) = workspace {
        if let Err(err) = workspace.unload().await {
            log::warn!(
                "cleanup failed workspace open error, workspace_id: {}, err: {}",
                workspace_id,
                err,
            );
        }
    }
}

async fn build_workspace_state_snapshot(
    workspace_id: &str,
    workspace: &WorkspaceInstance,
) -> Result<WorkspaceStateSnapshot> {
    let (record, settings) = {
        let workspace_registry = get_workspace_registry().await;
        let record = workspace_registry
            .get_workspace_record(workspace_id)
            .cloned()
            .ok_or(anyhow!("workspace is not found: {}", workspace_id))?;
        let settings = workspace_registry.get_workspace_settings(workspace_id)?;
        (record, settings)
    };

    Ok(WorkspaceStateSnapshot {
        record,
        settings,
        runtime_config: workspace.get_runtime_config().await,
        runtime_status: workspace.get_runtime_status().await,
    })
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
        if let Err(err) = workspace.reinit().await {
            cleanup_failed_workspace_open(&workspace_id).await;
            return Err(err.into());
        }
    }

    workspace.mark_opened().await;

    Ok(serde_json::json!(
        build_workspace_state_snapshot(&workspace_id, workspace.as_ref(),).await?
    ))
}

#[command("workspace.runtime")]
async fn close_workspace(workspace_id: String) -> Result<()> {
    let workspace = {
        let mut workspace_runtime = get_workspace_runtime_mut().await;
        workspace_runtime.close_workspace(&workspace_id)
    };

    if let Some(workspace) = workspace {
        workspace.mark_closing().await;
        workspace.unload().await?;
    }

    Ok(())
}

#[command("workspace.runtime")]
async fn get_open_workspace(workspace_id: String) -> Result<serde_json::Value> {
    let workspace = get_open_workspace_or_err(&workspace_id).await?;

    Ok(serde_json::json!(
        build_workspace_state_snapshot(&workspace_id, workspace.as_ref(),).await?
    ))
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

use std::sync::Arc;

use anyhow::{anyhow, Result};
use cmdreg::command;
use serde::Serialize;

use crate::workspace::{
    file_tree::{FileNode, FileTree},
    get_workspace_registry, get_workspace_registry_mut, get_workspace_runtime,
    get_workspace_runtime_mut,
    workspace_id::WorkspaceId,
    workspace_instance::{WorkspaceInstance, WorkspaceRuntimeConfig, WorkspaceRuntimeStatus},
    workspace_registry::WorkspaceRecord,
    workspace_relative_path::WorkspaceRelativePath,
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

fn parse_workspace_id(value: String) -> Result<WorkspaceId> {
    WorkspaceId::parse(value).map_err(Into::into)
}

async fn get_open_workspace_or_err(workspace_id: &WorkspaceId) -> Result<Arc<WorkspaceInstance>> {
    get_workspace_runtime()
        .await
        .get_open_workspace(workspace_id)
        .ok_or_else(|| anyhow!("Workspace 未打开: {workspace_id}"))
}

async fn build_snapshot(
    workspace_id: &WorkspaceId,
    workspace: &WorkspaceInstance,
) -> Result<WorkspaceStateSnapshot> {
    let (record, settings) = {
        let registry = get_workspace_registry().await;
        let record = registry
            .get_workspace_record(workspace_id)
            .cloned()
            .ok_or_else(|| anyhow!("Workspace 不存在: {workspace_id}"))?;
        let settings = registry.get_workspace_settings(workspace_id).await?;
        debug_assert_eq!(record.locator, workspace.locator);
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
async fn is_workspace_open(workspace_id: String) -> Result<bool> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    Ok(get_workspace_runtime()
        .await
        .is_workspace_open(&workspace_id))
}

#[command("workspace.runtime")]
async fn open_workspace(workspace_id: String) -> Result<serde_json::Value> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    let prepared = get_workspace_registry_mut()
        .await
        .prepare_workspace_open(&workspace_id)
        .await?;
    let workspace = {
        let mut runtime = get_workspace_runtime_mut().await;
        runtime.open_workspace(prepared)?.0
    };
    workspace.mark_opened().await;
    Ok(serde_json::json!(
        build_snapshot(&workspace_id, workspace.as_ref()).await?
    ))
}

#[command("workspace.runtime")]
async fn close_workspace(workspace_id: String) -> Result<()> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    let workspace = get_workspace_runtime_mut()
        .await
        .close_workspace(&workspace_id);
    if let Some(workspace) = workspace {
        workspace.unload().await;
    }
    Ok(())
}

#[command("workspace.runtime")]
async fn get_workspace_state(workspace_id: String) -> Result<serde_json::Value> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    let workspace = get_open_workspace_or_err(&workspace_id).await?;
    Ok(serde_json::json!(
        build_snapshot(&workspace_id, workspace.as_ref()).await?
    ))
}

#[command("workspace.runtime")]
async fn get_file_tree(workspace_id: String, recursive: Option<bool>) -> Result<FileTree> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    get_open_workspace_or_err(&workspace_id)
        .await?
        .get_file_tree(recursive.unwrap_or(false))
        .await
        .map_err(Into::into)
}

#[command("workspace.runtime")]
async fn get_file_node(
    workspace_id: String,
    path: String,
    recursive: Option<bool>,
) -> Result<Option<FileNode>> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    let path = WorkspaceRelativePath::parse(path)?;
    get_open_workspace_or_err(&workspace_id)
        .await?
        .get_file_node(path, recursive.unwrap_or(false))
        .await
        .map_err(Into::into)
}

#[command("workspace.runtime")]
async fn refresh_workspace(workspace_id: String) -> Result<()> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    get_open_workspace_or_err(&workspace_id)
        .await?
        .reinit()
        .await?;
    Ok(())
}

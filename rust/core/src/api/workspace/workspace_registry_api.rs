use anyhow::{anyhow, Result};
use cmdreg::{command, Json};
use serde::Deserialize;

use crate::{
    settings::get_settings,
    workspace::{
        get_workspace_registry, get_workspace_registry_mut, get_workspace_runtime,
        workspace_id::WorkspaceId,
        workspace_registry::{
            AttachWorkspaceRequest, CreateWorkspaceRequest, MoveWorkspaceRequest,
        },
        workspace_savedata::WorkspaceSaveData,
        workspace_settings::WorkspaceSettings,
    },
};

fn parse_workspace_id(value: String) -> Result<WorkspaceId> {
    WorkspaceId::parse(value).map_err(Into::into)
}

async fn ensure_workspace_closed(workspace_id: &WorkspaceId) -> Result<()> {
    if get_workspace_runtime()
        .await
        .is_workspace_open(workspace_id)
    {
        return Err(anyhow!("不能修改已打开的 Workspace: {workspace_id}"));
    }
    Ok(())
}

#[command("workspace.registry")]
async fn create_workspace(
    Json(request): Json<CreateWorkspaceRequest>,
) -> Result<serde_json::Value> {
    let record = get_workspace_registry_mut()
        .await
        .create_workspace(request)
        .await?;
    Ok(serde_json::json!(record))
}

#[command("workspace.registry")]
async fn attach_workspace(
    Json(request): Json<AttachWorkspaceRequest>,
) -> Result<serde_json::Value> {
    let record = get_workspace_registry_mut()
        .await
        .attach_workspace(request)
        .await?;
    Ok(serde_json::json!(record))
}

#[command("workspace.registry")]
async fn list_workspace_records() -> Result<serde_json::Value> {
    Ok(serde_json::json!(get_workspace_registry()
        .await
        .list_workspace_records()))
}

#[command("workspace.registry")]
async fn get_workspace_record(workspace_id: String) -> Result<serde_json::Value> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    let registry = get_workspace_registry().await;
    let record = registry
        .get_workspace_record(&workspace_id)
        .ok_or_else(|| anyhow!("Workspace 不存在: {workspace_id}"))?;
    Ok(serde_json::json!(record))
}

#[command("workspace.registry")]
async fn get_workspace_status(workspace_id: String) -> Result<serde_json::Value> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    Ok(serde_json::json!(
        get_workspace_registry()
            .await
            .get_workspace_status(&workspace_id)
            .await
    ))
}

#[command("workspace.registry")]
async fn list_workspace_statuses() -> Result<serde_json::Value> {
    Ok(serde_json::json!(
        get_workspace_registry()
            .await
            .list_workspace_statuses()
            .await
    ))
}

#[command("workspace.registry")]
async fn get_last_workspace_id() -> Result<Option<WorkspaceId>> {
    if !get_settings().await.auto_open_last_workspace {
        return Ok(None);
    }
    Ok(get_workspace_registry().await.get_last_workspace_id())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenameWorkspaceArgs {
    workspace_id: String,
    new_name: String,
}

#[command("workspace.registry")]
async fn rename_workspace(Json(args): Json<RenameWorkspaceArgs>) -> Result<serde_json::Value> {
    let workspace_id = parse_workspace_id(args.workspace_id)?;
    ensure_workspace_closed(&workspace_id).await?;
    let record = get_workspace_registry_mut()
        .await
        .rename_workspace(&workspace_id, args.new_name)
        .await?;
    Ok(serde_json::json!(record))
}

#[command("workspace.registry")]
async fn move_workspace(Json(request): Json<MoveWorkspaceRequest>) -> Result<serde_json::Value> {
    ensure_workspace_closed(&request.workspace_id).await?;
    let record = get_workspace_registry_mut()
        .await
        .move_workspace(request)
        .await?;
    Ok(serde_json::json!(record))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoveWorkspaceArgs {
    workspace_id: String,
    #[serde(default)]
    delete_files: bool,
}

#[command("workspace.registry")]
async fn remove_workspace(Json(args): Json<RemoveWorkspaceArgs>) -> Result<serde_json::Value> {
    let workspace_id = parse_workspace_id(args.workspace_id)?;
    ensure_workspace_closed(&workspace_id).await?;
    let result = get_workspace_registry_mut()
        .await
        .remove_workspace(&workspace_id, args.delete_files)
        .await?;
    Ok(serde_json::json!(result))
}

#[command("workspace.registry")]
async fn get_workspace_savedata(workspace_id: String) -> Result<serde_json::Value> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    let registry = get_workspace_registry().await;
    Ok(serde_json::json!(
        registry.get_workspace_savedata(&workspace_id)?
    ))
}

#[command("workspace.registry")]
async fn set_workspace_savedata(workspace_id: String, data: WorkspaceSaveData) -> Result<()> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    get_workspace_registry_mut()
        .await
        .set_workspace_savedata(&workspace_id, data)?;
    Ok(())
}

#[command("workspace.registry")]
async fn get_workspace_settings(workspace_id: String) -> Result<serde_json::Value> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    let settings = get_workspace_registry()
        .await
        .get_workspace_settings(&workspace_id)
        .await?;
    Ok(serde_json::json!(settings))
}

#[command("workspace.registry")]
async fn set_workspace_settings(
    workspace_id: String,
    settings: WorkspaceSettings,
) -> Result<serde_json::Value> {
    let workspace_id = parse_workspace_id(workspace_id)?;
    let settings = get_workspace_registry_mut()
        .await
        .set_workspace_settings(&workspace_id, settings)
        .await?;

    if let Some(workspace) = get_workspace_runtime()
        .await
        .get_open_workspace(&workspace_id)
    {
        workspace.apply_settings(&settings).await;
    }
    Ok(serde_json::json!(settings))
}

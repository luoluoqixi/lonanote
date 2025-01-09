use anyhow::{anyhow, Result};
use lonanote_commands::{
    body::Json,
    reg_command_async,
    result::{CommandResponse, CommandResult},
};

use crate::workspace::{
    get_workspace_manager, get_workspace_manager_mut, workspace_metadata::WorkspaceMetadata,
    workspace_settings::WorkspaceSettings,
};

async fn get_current_workspace() -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let current_workspace = workspace_manager.get_current_workspace()?;
    if let Some(workspace) = current_workspace {
        let res = CommandResponse::json(workspace)?;
        Ok(res)
    } else {
        Ok(CommandResponse::None)
    }
}

async fn set_current_workspace_metadata(Json(metadata): Json<WorkspaceMetadata>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let current_workspace = workspace_manager.get_current_workspace()?;
    if let Some(workspace) = current_workspace {
        let path = workspace.metadata.path.clone();
        let mut workspace_manager = get_workspace_manager_mut().await;
        workspace_manager
            .set_workspace_metadata(path, metadata)
            .await?;
        Ok(CommandResponse::None)
    } else {
        Err(anyhow!("no workspace is open"))
    }
}

async fn set_current_workspace_settings(Json(settings): Json<WorkspaceSettings>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let current_workspace = workspace_manager.get_current_workspace_mut()?;
    if let Some(workspace) = current_workspace {
        workspace.set_settings(settings).await?;
        Ok(CommandResponse::None)
    } else {
        Err(anyhow!("no workspace is open"))
    }
}

#[derive(Debug, serde::Deserialize)]
struct SetWorkspaceMetadataArgs {
    pub path: String,
    pub metadata: WorkspaceMetadata,
}

async fn set_workspace_metadata(Json(args): Json<SetWorkspaceMetadataArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .set_workspace_metadata(args.path, args.metadata)
        .await?;

    Ok(CommandResponse::None)
}

async fn get_init_workspace() -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager.get_init_workspace().await?;
    let res = CommandResponse::json(workspace)?;

    Ok(res)
}

async fn get_workspaces_metadata() -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspaces = workspace_manager.get_workspaces_metadata();

    CommandResponse::json(workspaces)
}

async fn open_workspace_by_path(Json(path): Json<String>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager.load_workspace(path)?;
    let res = CommandResponse::json(workspace)?;

    Ok(res)
}

pub fn reg_commands() -> Result<()> {
    reg_command_async("get_current_workspace", get_current_workspace)?;
    reg_command_async(
        "set_current_workspace_metadata",
        set_current_workspace_metadata,
    )?;
    reg_command_async(
        "set_current_workspace_settings",
        set_current_workspace_settings,
    )?;
    reg_command_async("set_workspace_metadata", set_workspace_metadata)?;
    reg_command_async("get_init_workspace", get_init_workspace)?;
    reg_command_async("get_workspaces_metadata", get_workspaces_metadata)?;
    reg_command_async("open_workspace_by_path", open_workspace_by_path)?;
    Ok(())
}

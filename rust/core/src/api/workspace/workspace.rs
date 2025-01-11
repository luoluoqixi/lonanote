use anyhow::{anyhow, Result};
use lonanote_commands::{
    body::Json,
    reg_command_async,
    result::{CommandResponse, CommandResult},
};

use crate::workspace::{
    get_workspace_manager, get_workspace_manager_mut, workspace_settings::WorkspaceSettings,
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

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetCurrentWorkspacePathArgs {
    pub new_path: String,
    pub is_move: bool,
}

async fn set_current_workspace_path(
    Json(args): Json<SetCurrentWorkspacePathArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let current_workspace = workspace_manager.get_current_workspace()?;
    if let Some(workspace) = current_workspace {
        let path = workspace.metadata.path.clone();
        workspace_manager
            .set_workspace_path(path.to_str().unwrap(), args.new_path, args.is_move)
            .await?;
        Ok(CommandResponse::None)
    } else {
        Err(anyhow!("no workspace is open"))
    }
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetCurrentWorkspaceNameArgs {
    pub new_name: String,
    pub is_move: bool,
}

async fn set_current_workspace_name(
    Json(args): Json<SetCurrentWorkspaceNameArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let current_workspace = workspace_manager.get_current_workspace()?;
    if let Some(workspace) = current_workspace {
        let path = workspace.metadata.path.clone();
        workspace_manager
            .set_workspace_name(path.to_str().unwrap(), args.new_name, args.is_move)
            .await?;
        Ok(CommandResponse::None)
    } else {
        Err(anyhow!("no workspace is open"))
    }
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetCurrentWorkspaceSettingsArgs {
    pub new_settings: WorkspaceSettings,
}

async fn set_current_workspace_settings(
    Json(args): Json<SetCurrentWorkspaceSettingsArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let current_workspace = workspace_manager.get_current_workspace_mut()?;
    if let Some(workspace) = current_workspace {
        workspace.set_settings(args.new_settings).await?;
        Ok(CommandResponse::None)
    } else {
        Err(anyhow!("no workspace is open"))
    }
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetWorkspacePathArgs {
    pub path: String,
    pub new_path: String,
    pub is_move: bool,
}

async fn set_workspace_path(Json(args): Json<SetWorkspacePathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .set_workspace_path(args.path, args.new_path, args.is_move)
        .await?;

    Ok(CommandResponse::None)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetWorkspaceNameArgs {
    pub path: String,
    pub new_name: String,
    pub is_move: bool,
}

async fn set_workspace_name(Json(args): Json<SetWorkspaceNameArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .set_workspace_name(args.path, args.new_name, args.is_move)
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

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenWorkspaceByPathArgs {
    pub path: String,
}

async fn open_workspace_by_path(Json(args): Json<OpenWorkspaceByPathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager.load_workspace(args.path)?;
    let res = CommandResponse::json(workspace)?;

    Ok(res)
}

pub fn reg_commands() -> Result<()> {
    reg_command_async("get_current_workspace", get_current_workspace)?;
    reg_command_async("set_current_workspace_path", set_current_workspace_path)?;
    reg_command_async("set_current_workspace_name", set_current_workspace_name)?;
    reg_command_async(
        "set_current_workspace_settings",
        set_current_workspace_settings,
    )?;
    reg_command_async("set_workspace_path", set_workspace_path)?;
    reg_command_async("set_workspace_name", set_workspace_name)?;
    reg_command_async("get_init_workspace", get_init_workspace)?;
    reg_command_async("get_workspaces_metadata", get_workspaces_metadata)?;
    reg_command_async("open_workspace_by_path", open_workspace_by_path)?;
    Ok(())
}

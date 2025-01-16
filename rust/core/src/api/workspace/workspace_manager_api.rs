use anyhow::Result;

use crate::{
    settings::get_settings,
    workspace::{get_workspace_manager, get_workspace_manager_mut},
};

use lonanote_commands::{
    body::Json,
    reg_command_async,
    result::{CommandResponse, CommandResult},
};

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetWorkspaceRootPathArgs {
    pub path: String,
    pub new_path: String,
    pub is_move: bool,
}

async fn set_workspace_root_path(Json(args): Json<SetWorkspaceRootPathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .set_workspace_root_path(args.path, args.new_path, args.is_move)
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
    workspace_manager.load_workspace(args.path)?;

    Ok(CommandResponse::None)
}

async fn unload_workspace_by_path(Json(args): Json<OpenWorkspaceByPathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager.unload_workspace(args.path).await?;

    Ok(CommandResponse::None)
}

async fn get_last_workspace() -> CommandResult {
    let auto_open_list_workspace = get_settings().await.auto_open_last_workspace;
    if !auto_open_list_workspace {
        Ok(CommandResponse::None)
    } else {
        let workspace_manager = get_workspace_manager().await;

        Ok(CommandResponse::json(&workspace_manager.last_workspace)?)
    }
}

pub fn reg_commands() -> Result<()> {
    reg_command_async("set_workspace_root_path", set_workspace_root_path)?;
    reg_command_async("set_workspace_name", set_workspace_name)?;
    reg_command_async("get_workspaces_metadata", get_workspaces_metadata)?;
    reg_command_async("open_workspace_by_path", open_workspace_by_path)?;
    reg_command_async("unload_workspace_by_path", unload_workspace_by_path)?;
    reg_command_async("get_last_workspace", get_last_workspace)?;
    Ok(())
}

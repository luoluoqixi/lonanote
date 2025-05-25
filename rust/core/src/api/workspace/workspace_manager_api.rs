use std::path::PathBuf;

use anyhow::Result;

use crate::{
    settings::get_settings,
    workspace::{
        get_workspace_manager, get_workspace_manager_mut, workspace_savedata::WorkspaceSaveData,
    },
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

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoveWorkspaceArgs {
    pub path: String,
}

async fn remove_workspace(Json(args): Json<RemoveWorkspaceArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager.remove_workspace(args.path).await?;

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
    workspace_manager.load_workspace(args.path).await?;

    Ok(CommandResponse::None)
}

async fn create_workspace(Json(args): Json<OpenWorkspaceByPathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager.create_workspace(args.path).await?;

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

        CommandResponse::json(&workspace_manager.last_workspace)
    }
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CheckWorkspacePathArgs {
    pub workspace_path: String,
}
async fn check_workspace_path_exist(Json(args): Json<CheckWorkspacePathArgs>) -> CommandResult {
    let path = PathBuf::from(args.workspace_path);
    let exists = path.exists() && path.is_dir();
    CommandResponse::json(exists)
}
async fn check_workspace_path_legal(Json(args): Json<CheckWorkspacePathArgs>) -> CommandResult {
    let legal = !args.workspace_path.is_empty();
    CommandResponse::json(legal)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct GetWorkspaceSaveDataArgs {
    pub workspace_path: String,
}
async fn get_workspace_savedata(Json(args): Json<GetWorkspaceSaveDataArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let savedata = workspace_manager.get_workspace_savedata(args.workspace_path)?;
    if savedata.is_none() {
        CommandResponse::json(WorkspaceSaveData::new())
    } else {
        CommandResponse::json(savedata)
    }
}
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetWorkspaceSaveDataArgs {
    pub workspace_path: String,
    pub data: WorkspaceSaveData,
}
async fn set_workspace_savedata(Json(args): Json<SetWorkspaceSaveDataArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager.set_workspace_savedata(args.workspace_path, args.data)?;

    Ok(CommandResponse::None)
}

pub fn reg_commands() -> Result<()> {
    reg_command_async("workspace.set_workspace_root_path", set_workspace_root_path)?;
    reg_command_async("workspace.set_workspace_name", set_workspace_name)?;
    reg_command_async("workspace.remove_workspace", remove_workspace)?;
    reg_command_async("workspace.get_workspaces_metadata", get_workspaces_metadata)?;
    reg_command_async("workspace.open_workspace_by_path", open_workspace_by_path)?;
    reg_command_async("workspace.create_workspace", create_workspace)?;
    reg_command_async(
        "workspace.unload_workspace_by_path",
        unload_workspace_by_path,
    )?;
    reg_command_async("workspace.get_last_workspace", get_last_workspace)?;
    reg_command_async(
        "workspace.check_workspace_path_exist",
        check_workspace_path_exist,
    )?;
    reg_command_async(
        "workspace.check_workspace_path_legal",
        check_workspace_path_legal,
    )?;
    reg_command_async("workspace.get_workspace_savedata", get_workspace_savedata)?;
    reg_command_async("workspace.set_workspace_savedata", set_workspace_savedata)?;
    Ok(())
}

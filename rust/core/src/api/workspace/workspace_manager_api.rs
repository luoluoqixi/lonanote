use std::path::PathBuf;

use anyhow::anyhow;

use crate::{
    settings::get_settings,
    workspace::{
        get_workspace_manager, get_workspace_manager_mut, workspace_path::WorkspacePath,
        workspace_savedata::WorkspaceSaveData,
    },
};

use cmdreg::{command, CommandResponse, CommandResult, Json};

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetWorkspaceRootPathArgs {
    pub path: String,
    pub new_path: String,
    pub is_move: bool,
}

#[command("workspace")]
async fn init_setup(Json(args): Json<OpenWorkspaceByPathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .init_setup(&WorkspacePath::from(&args.path))
        .await
        .map_err(|err| anyhow!("workspace init_setup error: {}", err,))?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn set_workspace_root_path(Json(args): Json<SetWorkspaceRootPathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .set_workspace_root_path(
            &WorkspacePath::from(&args.path),
            args.new_path,
            args.is_move,
        )
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

#[command("workspace")]
async fn set_workspace_name(Json(args): Json<SetWorkspaceNameArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .set_workspace_name(
            &WorkspacePath::from(&args.path),
            args.new_name,
            args.is_move,
        )
        .await?;

    Ok(CommandResponse::None)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoveWorkspaceArgs {
    pub path: String,
    #[serde(default = "RemoveWorkspaceArgs::default_delete_file")]
    pub delete_file: bool,
}

impl RemoveWorkspaceArgs {
    pub const fn default_delete_file() -> bool {
        false
    }
}

#[command("workspace")]
async fn remove_workspace(Json(args): Json<RemoveWorkspaceArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .remove_workspace(&WorkspacePath::from(&args.path), args.delete_file)
        .await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
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

#[command("workspace")]
async fn open_workspace_by_path(Json(args): Json<OpenWorkspaceByPathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .load_workspace(&WorkspacePath::from(&args.path))
        .await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn create_workspace(Json(args): Json<OpenWorkspaceByPathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .create_workspace(&WorkspacePath::from(&args.path))
        .await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn unload_workspace_by_path(Json(args): Json<OpenWorkspaceByPathArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .unload_workspace(&WorkspacePath::from(&args.path))
        .await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
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

#[command("workspace")]
async fn check_workspace_path_exist(Json(args): Json<CheckWorkspacePathArgs>) -> CommandResult {
    let path = PathBuf::from(args.workspace_path);
    let exists = path.exists() && path.is_dir();
    CommandResponse::json(exists)
}

#[command("workspace")]
async fn check_workspace_path_legal(Json(args): Json<CheckWorkspacePathArgs>) -> CommandResult {
    let legal = !args.workspace_path.is_empty();
    CommandResponse::json(legal)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct GetWorkspaceSaveDataArgs {
    pub workspace_path: String,
}

#[command("workspace")]
async fn get_workspace_savedata(Json(args): Json<GetWorkspaceSaveDataArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let savedata =
        workspace_manager.get_workspace_savedata(&WorkspacePath::from(&args.workspace_path))?;
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

#[command("workspace")]
async fn set_workspace_savedata(Json(args): Json<SetWorkspaceSaveDataArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .set_workspace_savedata(&WorkspacePath::from(&args.workspace_path), args.data)?;

    Ok(CommandResponse::None)
}

use anyhow::{anyhow, Result};

use crate::workspace::{
    get_workspace_manager, get_workspace_manager_mut, workspace_settings::WorkspaceSettings,
};

use lonanote_commands::{
    body::Json,
    reg_command_async,
    result::{CommandResponse, CommandResult},
};

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct GetWorkspaceArgs {
    pub path: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetOpenWorkspaceSettingsArgs {
    pub path: String,
    pub settings: WorkspaceSettings,
}

async fn is_open_workspace(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let is_open = workspace_manager.get_workspace(&args.path).is_some();

    CommandResponse::json(is_open)
}

async fn get_open_workspace(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;

    CommandResponse::json(workspace)
}

async fn set_open_workspace_settings(
    Json(args): Json<SetOpenWorkspaceSettingsArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.set_settings(args.settings).await?;

    Ok(CommandResponse::None)
}

async fn get_open_workspace_settings(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;

    CommandResponse::json(&workspace.settings)
}

async fn get_open_workspace_file_tree(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;

    let file_tree = workspace.get_file_tree().await;
    CommandResponse::json(file_tree)
}

async fn call_open_workspace_reinit(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.reinit().await?;

    Ok(CommandResponse::None)
}

pub fn reg_commands() -> Result<()> {
    reg_command_async("is_open_workspace", is_open_workspace)?;
    reg_command_async("get_open_workspace", get_open_workspace)?;
    reg_command_async("set_open_workspace_settings", set_open_workspace_settings)?;
    reg_command_async("get_open_workspace_settings", get_open_workspace_settings)?;
    reg_command_async("get_open_workspace_file_tree", get_open_workspace_file_tree)?;
    reg_command_async("call_open_workspace_reinit", call_open_workspace_reinit)?;

    Ok(())
}

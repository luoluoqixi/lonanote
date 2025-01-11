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

async fn get_open_workspace(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;

    Ok(CommandResponse::json(workspace)?)
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

    Ok(CommandResponse::json(&workspace.settings)?)
}

pub fn reg_commands() -> Result<()> {
    reg_command_async("get_open_workspace", get_open_workspace)?;
    reg_command_async("set_open_workspace_settings", set_open_workspace_settings)?;
    reg_command_async("get_open_workspace_settings", get_open_workspace_settings)?;
    Ok(())
}

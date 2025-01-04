use anyhow::Result;
use lonanote_commands::{
    body::Json,
    reg_command_async,
    result::{CommandResponse, CommandResult},
};

use crate::workspace::WORKSPACE_MANAGER;

async fn get_current_workspace() -> CommandResult {
    let workspace_manager = WORKSPACE_MANAGER.read().await;
    let current_workspace = workspace_manager.get_current_workspace()?;
    if let Some(workspace) = current_workspace {
        let res = CommandResponse::json(workspace)?;
        Ok(res)
    } else {
        Ok(CommandResponse::None)
    }
}

async fn get_init_workspace() -> CommandResult {
    let mut workspace_manager = WORKSPACE_MANAGER.write().await;
    let workspace = workspace_manager.get_init_workspace().await?;
    let res = CommandResponse::json(workspace)?;

    Ok(res)
}

async fn get_workspaces_metadata() -> CommandResult {
    let workspace_manager = WORKSPACE_MANAGER.read().await;
    let workspaces = workspace_manager.get_workspaces_metadata();

    CommandResponse::json(workspaces)
}

#[derive(Debug, serde::Deserialize)]
struct OpenWorkspaceByPathArgs {
    pub path: String,
}

async fn open_workspace_by_path(Json(args): Json<OpenWorkspaceByPathArgs>) -> CommandResult {
    let path = args.path;

    let mut workspace_manager = WORKSPACE_MANAGER.write().await;
    let workspace = workspace_manager.load_workspace(path)?;
    let res = CommandResponse::json(workspace)?;

    Ok(res)
}

pub fn reg_commands() -> Result<()> {
    reg_command_async("get_current_workspace", get_current_workspace)?;
    reg_command_async("get_init_workspace", get_init_workspace)?;
    reg_command_async("get_workspaces_metadata", get_workspaces_metadata)?;
    reg_command_async("open_workspace_by_path", open_workspace_by_path)?;
    Ok(())
}

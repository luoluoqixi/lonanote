use anyhow::Result;
use lonanote_commands::{
    reg_command_async,
    result::{CommandResponse, CommandResult},
};

use crate::workspace::WORKSPACE_MANAGER;

async fn get_current_workspace_metadata() -> CommandResult {
    let mut workspace_manager = WORKSPACE_MANAGER.write().await;
    let current_workspace = workspace_manager.get_current_workspace()?;
    if let Some(workspace) = current_workspace {
        let metadata = &workspace.metadata;
        let res = CommandResponse::json(metadata)?;
        Ok(res)
    } else {
        Ok(CommandResponse::None)
    }
}

async fn get_current_workspace_settings() -> CommandResult {
    let mut workspace_manager = WORKSPACE_MANAGER.write().await;
    let current_workspace = workspace_manager.get_current_workspace()?;
    if let Some(workspace) = current_workspace {
        let settings = &workspace.settings;
        let res = CommandResponse::json(settings)?;
        Ok(res)
    } else {
        Ok(CommandResponse::None)
    }
}

async fn get_workspaces_metadata() -> CommandResult {
    let workspace_manager = WORKSPACE_MANAGER.read().await;
    let workspaces = workspace_manager.get_workspaces_metadata();

    CommandResponse::json(workspaces)
}

pub fn reg_commands() -> Result<()> {
    reg_command_async(
        "get_current_workspace_metadata",
        get_current_workspace_metadata,
    )?;
    reg_command_async(
        "get_current_workspace_settings",
        get_current_workspace_settings,
    )?;
    reg_command_async("get_workspaces_metadata", get_workspaces_metadata)?;
    Ok(())
}

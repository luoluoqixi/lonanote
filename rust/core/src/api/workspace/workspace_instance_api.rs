use anyhow::{anyhow, Result};

use crate::workspace::{
    file_tree::FileTreeSortType, get_workspace_manager, get_workspace_manager_mut,
    workspace_settings::WorkspaceSettings,
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

    let index = workspace.get_workspace_index().await;
    CommandResponse::json(&index.file_tree)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetWorkspaceFileTreeSortTypeArgs {
    pub path: String,
    pub sort_type: FileTreeSortType,
}

async fn set_open_workspace_file_tree_sort_type(
    Json(args): Json<SetWorkspaceFileTreeSortTypeArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.set_file_tree_sort_type(args.sort_type).await?;

    Ok(CommandResponse::None)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetWorkspaceFollowGitignoreArgs {
    pub path: String,
    pub follow_gitignore: bool,
}

async fn set_open_workspace_follow_gitignore(
    Json(args): Json<SetWorkspaceFollowGitignoreArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace
        .set_follow_gitignore(args.follow_gitignore)
        .await?;

    Ok(CommandResponse::None)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetWorkspaceCustomIgnoreArgs {
    pub path: String,
    pub custom_ignore: String,
}

async fn set_open_workspace_custom_ignore(
    Json(args): Json<SetWorkspaceCustomIgnoreArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.set_custom_ignore(args.custom_ignore).await?;

    Ok(CommandResponse::None)
}

async fn reset_open_workspace_custom_ignore(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&args.path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.reset_custom_ignore().await?;

    Ok(CommandResponse::None)
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
    reg_command_async("workspace.is_open_workspace", is_open_workspace)?;
    reg_command_async("workspace.get_open_workspace", get_open_workspace)?;
    reg_command_async(
        "workspace.set_open_workspace_settings",
        set_open_workspace_settings,
    )?;
    reg_command_async(
        "workspace.get_open_workspace_settings",
        get_open_workspace_settings,
    )?;
    reg_command_async(
        "workspace.get_open_workspace_file_tree",
        get_open_workspace_file_tree,
    )?;
    reg_command_async(
        "workspace.set_open_workspace_file_tree_sort_type",
        set_open_workspace_file_tree_sort_type,
    )?;
    reg_command_async(
        "workspace.set_open_workspace_follow_gitignore",
        set_open_workspace_follow_gitignore,
    )?;
    reg_command_async(
        "workspace.set_open_workspace_custom_ignore",
        set_open_workspace_custom_ignore,
    )?;
    reg_command_async(
        "workspace.reset_open_workspace_custom_ignore",
        reset_open_workspace_custom_ignore,
    )?;
    reg_command_async(
        "workspace.call_open_workspace_reinit",
        call_open_workspace_reinit,
    )?;

    Ok(())
}

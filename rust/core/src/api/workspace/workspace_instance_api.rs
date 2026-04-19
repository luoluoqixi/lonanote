use anyhow::anyhow;

use crate::workspace::{
    file_tree::FileTreeSortType, get_workspace_manager, get_workspace_manager_mut,
    workspace_path::WorkspacePath, workspace_settings::WorkspaceSettings,
};

use cmdreg::{command, CommandResponse, CommandResult, Json};

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

#[command("workspace")]
async fn import_init_workspace(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;

    workspace_manager
        .import_init_data(&WorkspacePath::from(&args.path))
        .await
        .map_err(|err| {
            anyhow!(
                "workspace import_init_workspace error: {}, path: {}",
                err,
                &args.path,
            )
        })?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn is_open_workspace(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let is_open = workspace_manager
        .get_workspace(&WorkspacePath::from(&args.path))
        .is_some();

    CommandResponse::json(is_open)
}

#[command("workspace")]
async fn get_open_workspace(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let path = WorkspacePath::from(&args.path);
    let workspace = workspace_manager
        .get_workspace(&path)
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    let metadata = workspace_manager.get_workspace_metadata(&path);

    let ws = serde_json::json!({
        "settings": &workspace.settings,
        "metadata": &metadata,
    });

    CommandResponse::json(ws)
}

#[command("workspace")]
async fn set_open_workspace_settings(
    Json(args): Json<SetOpenWorkspaceSettingsArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.set_settings(args.settings).await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn get_open_workspace_settings(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;

    CommandResponse::json(&workspace.settings)
}

#[command("workspace")]
async fn get_open_workspace_file_tree(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;

    let index = workspace.get_workspace_index().await;
    CommandResponse::json(&index.file_tree)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct GetWorkspaceFileNodeArgs {
    pub path: String,

    pub node_path: Option<String>,
    pub sort_type: FileTreeSortType,
    pub recursive: bool,
}

#[command("workspace")]
async fn get_open_workspace_file_node(Json(args): Json<GetWorkspaceFileNodeArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;

    let node = workspace
        .get_node(args.node_path.as_ref(), args.sort_type, args.recursive)
        .await
        .map_err(|err| {
            anyhow!(
                "workspace get_node error: {}, path: {}, {:?}",
                err,
                &args.path,
                &args.node_path
            )
        })?;

    CommandResponse::json(node)
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetWorkspaceFileTreeSortTypeArgs {
    pub path: String,
    pub sort_type: FileTreeSortType,
}

#[command("workspace")]
async fn set_open_workspace_file_tree_sort_type(
    Json(args): Json<SetWorkspaceFileTreeSortTypeArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&args.path))
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

#[command("workspace")]
async fn set_open_workspace_follow_gitignore(
    Json(args): Json<SetWorkspaceFollowGitignoreArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&args.path))
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

#[command("workspace")]
async fn set_open_workspace_custom_ignore(
    Json(args): Json<SetWorkspaceCustomIgnoreArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.set_custom_ignore(args.custom_ignore).await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn reset_open_workspace_custom_ignore(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.reset_custom_ignore().await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn call_open_workspace_reinit(Json(args): Json<GetWorkspaceArgs>) -> CommandResult {
    let workspace_manager = get_workspace_manager().await;
    let workspace = workspace_manager
        .get_workspace(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.reinit().await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn reset_open_workspace_histroy_snapshoot_count(
    Json(args): Json<GetWorkspaceArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.reset_histroy_snapshoot_count().await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn reset_open_workspace_upload_attachment_path(
    Json(args): Json<GetWorkspaceArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.reset_upload_attachment_path().await?;

    Ok(CommandResponse::None)
}

#[command("workspace")]
async fn reset_open_workspace_upload_image_path(
    Json(args): Json<GetWorkspaceArgs>,
) -> CommandResult {
    let mut workspace_manager = get_workspace_manager_mut().await;
    let workspace = workspace_manager
        .get_workspace_mut(&WorkspacePath::from(&args.path))
        .ok_or(anyhow!("workspace is not open: {}", &args.path))?;
    workspace.reset_pload_image_path().await?;

    Ok(CommandResponse::None)
}

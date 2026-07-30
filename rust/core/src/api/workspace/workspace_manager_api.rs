use anyhow::{anyhow, Result};
use cmdreg::{command, Json};
use std::path::PathBuf;

use crate::{
    settings::get_settings,
    workspace::{
        get_workspace_manager, get_workspace_manager_mut, workspace_path::WorkspacePath,
        workspace_savedata::WorkspaceSaveData,
    },
};

#[command("workspace")]
async fn init_setup(path: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .init_setup(&WorkspacePath::from(&path))
        .await
        .map_err(|err| anyhow!("workspace init_setup error: {}", err,))?;

    Ok(())
}

#[command("workspace")]
async fn set_workspace_root_path(path: String, new_path: String, is_move: bool) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .set_workspace_root_path(&WorkspacePath::from(&path), new_path, is_move)
        .await?;

    Ok(())
}

#[command("workspace")]
async fn set_workspace_name(path: String, new_name: String, is_move: bool) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .set_workspace_name(&WorkspacePath::from(&path), new_name, is_move)
        .await?;

    Ok(())
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
async fn remove_workspace(Json(args): Json<RemoveWorkspaceArgs>) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .remove_workspace(&WorkspacePath::from(&args.path), args.delete_file)
        .await?;

    Ok(())
}

#[command("workspace")]
async fn get_workspaces_metadata() -> Result<serde_json::Value> {
    let workspace_manager = get_workspace_manager().await;
    let workspaces = workspace_manager.get_workspaces_metadata();

    // 使用 json 返回可以少一次 clone
    Ok(serde_json::json!(workspaces))
}

#[command("workspace")]
async fn open_workspace_by_path(path: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .load_workspace(&WorkspacePath::from(&path))
        .await?;

    Ok(())
}

#[command("workspace")]
async fn create_workspace(path: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .create_workspace(&WorkspacePath::from(&path))
        .await?;

    Ok(())
}

#[command("workspace")]
async fn unload_workspace_by_path(path: String) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager
        .unload_workspace(&WorkspacePath::from(&path))
        .await?;

    Ok(())
}

#[command("workspace")]
async fn get_last_workspace() -> Result<Option<serde_json::Value>> {
    let auto_open_list_workspace = get_settings().await.auto_open_last_workspace;
    if !auto_open_list_workspace {
        Ok(None)
    } else {
        let workspace_manager = get_workspace_manager().await;

        Ok(Some(serde_json::json!(workspace_manager.last_workspace)))
    }
}

#[command("workspace")]
async fn check_workspace_path_exist(workspace_path: String) -> Result<bool> {
    let path = PathBuf::from(workspace_path);
    let exists = path.exists() && path.is_dir();
    Ok(exists)
}

#[command("workspace")]
async fn check_workspace_path_legal(workspace_path: String) -> Result<bool> {
    let legal = !workspace_path.is_empty();
    Ok(legal)
}

#[command("workspace")]
async fn get_workspace_savedata(workspace_path: String) -> Result<serde_json::Value> {
    let workspace_manager = get_workspace_manager().await;
    let savedata =
        workspace_manager.get_workspace_savedata(&WorkspacePath::from(&workspace_path))?;
    if let Some(savedata) = savedata {
        Ok(serde_json::json!(savedata))
    } else {
        Ok(serde_json::json!(WorkspaceSaveData::new()))
    }
}

#[command("workspace")]
async fn set_workspace_savedata(workspace_path: String, data: WorkspaceSaveData) -> Result<()> {
    let mut workspace_manager = get_workspace_manager_mut().await;
    workspace_manager.set_workspace_savedata(&WorkspacePath::from(&workspace_path), data)?;

    Ok(())
}

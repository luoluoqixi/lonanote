use anyhow::{anyhow, Result};
use cmdreg::{command, Json};
use std::path::PathBuf;

use crate::{
    settings::get_settings,
    workspace::{
        error::WorkspaceError,
        get_workspace_registry, get_workspace_registry_mut, get_workspace_runtime,
        workspace_locator::{
            get_workspace_roots, set_workspace_roots as set_runtime_workspace_roots, WorkspaceRoot,
        },
        workspace_path::WorkspacePath,
        workspace_savedata::WorkspaceSaveData,
        workspace_settings::WorkspaceSettings,
    },
};

async fn ensure_workspace_closed(workspace_id: &str, error: WorkspaceError) -> Result<()> {
    let workspace_runtime = get_workspace_runtime().await;
    if workspace_runtime.is_workspace_open(workspace_id) {
        return Err(anyhow!(format!("{}", error)));
    }

    Ok(())
}

#[command("workspace.registry")]
async fn init_setup(path: String) -> Result<()> {
    let mut workspace_registry = get_workspace_registry_mut().await;
    workspace_registry
        .init_setup(&WorkspacePath::from(&path))
        .await
        .map_err(|err| anyhow!("workspace init_setup error: {}", err,))?;

    Ok(())
}

#[command("workspace.registry")]
async fn rename_workspace(
    workspace_id: String,
    new_name: String,
    is_move: bool,
) -> Result<serde_json::Value> {
    ensure_workspace_closed(
        &workspace_id,
        WorkspaceError::AlreadyExistOpenWorkspace(workspace_id.clone()),
    )
    .await?;

    let mut workspace_registry = get_workspace_registry_mut().await;
    let record = workspace_registry.set_workspace_name(&workspace_id, new_name, is_move)?;

    Ok(serde_json::json!(record))
}

#[command("workspace.registry")]
async fn move_workspace(
    workspace_id: String,
    new_path: String,
    is_move: bool,
) -> Result<serde_json::Value> {
    ensure_workspace_closed(
        &workspace_id,
        WorkspaceError::AlreadyExistOpenWorkspace(workspace_id.clone()),
    )
    .await?;

    let mut workspace_registry = get_workspace_registry_mut().await;
    let record = workspace_registry.set_workspace_path(
        &workspace_id,
        &WorkspacePath::from(&new_path),
        is_move,
    )?;

    Ok(serde_json::json!(record))
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoveWorkspaceArgs {
    pub workspace_id: String,
    #[serde(default = "RemoveWorkspaceArgs::default_delete_file")]
    pub delete_file: bool,
}

impl RemoveWorkspaceArgs {
    pub const fn default_delete_file() -> bool {
        false
    }
}

#[command("workspace.registry")]
async fn remove_workspace(Json(args): Json<RemoveWorkspaceArgs>) -> Result<()> {
    ensure_workspace_closed(
        &args.workspace_id,
        WorkspaceError::RemoveAlreadyOpenWorkspace(args.workspace_id.clone()),
    )
    .await?;

    let mut workspace_registry = get_workspace_registry_mut().await;
    workspace_registry.remove_workspace(&args.workspace_id, args.delete_file)?;

    Ok(())
}

#[command("workspace.registry")]
async fn list_workspace_records() -> Result<serde_json::Value> {
    let workspace_registry = get_workspace_registry().await;
    let workspaces = workspace_registry.list_workspace_records();

    Ok(serde_json::json!(workspaces))
}

#[command("workspace.registry")]
async fn get_workspace_record(workspace_id: String) -> Result<serde_json::Value> {
    let workspace_registry = get_workspace_registry().await;
    let record = workspace_registry
        .get_workspace_record(&workspace_id)
        .ok_or(anyhow!("workspace is not found: {}", &workspace_id))?;

    Ok(serde_json::json!(record))
}

#[command("workspace.registry")]
async fn create_workspace(path: String) -> Result<serde_json::Value> {
    let mut workspace_registry = get_workspace_registry_mut().await;
    let record = workspace_registry.create_workspace(&WorkspacePath::from(&path))?;

    Ok(serde_json::json!(record))
}

#[command("workspace.registry")]
async fn get_last_workspace_id() -> Result<Option<String>> {
    let auto_open_list_workspace = get_settings().await.auto_open_last_workspace;
    if !auto_open_list_workspace {
        Ok(None)
    } else {
        let workspace_registry = get_workspace_registry().await;
        Ok(workspace_registry.get_last_workspace_id())
    }
}

#[command("workspace.registry")]
async fn set_workspace_roots(roots: Vec<WorkspaceRoot>) -> Result<serde_json::Value> {
    set_runtime_workspace_roots(roots);
    let mut workspace_registry = get_workspace_registry_mut().await;
    let summary = workspace_registry.sync_workspace_roots()?;

    Ok(serde_json::json!(summary))
}

#[command("workspace.registry")]
async fn get_workspace_roots_config() -> Result<serde_json::Value> {
    Ok(serde_json::json!(get_workspace_roots()))
}

#[command("workspace.registry")]
async fn sync_workspace_roots() -> Result<serde_json::Value> {
    let mut workspace_registry = get_workspace_registry_mut().await;
    let summary = workspace_registry.sync_workspace_roots()?;

    Ok(serde_json::json!(summary))
}

#[command("workspace.registry")]
async fn create_workspace_in_root(root_key: String, name: String) -> Result<serde_json::Value> {
    let mut workspace_registry = get_workspace_registry_mut().await;
    let record = workspace_registry.create_workspace_in_root(root_key, name)?;

    Ok(serde_json::json!(record))
}

#[command("workspace.registry")]
async fn check_workspace_path_exist(workspace_path: String) -> Result<bool> {
    let path = PathBuf::from(workspace_path);
    let exists = path.exists() && path.is_dir();
    Ok(exists)
}

#[command("workspace.registry")]
async fn check_workspace_path_legal(workspace_path: String) -> Result<bool> {
    let legal = !workspace_path.is_empty();
    Ok(legal)
}

#[command("workspace.registry")]
async fn get_workspace_savedata(workspace_id: String) -> Result<serde_json::Value> {
    let workspace_registry = get_workspace_registry().await;
    let savedata = workspace_registry.get_workspace_savedata(&workspace_id)?;
    Ok(serde_json::json!(savedata))
}

#[command("workspace.registry")]
async fn set_workspace_savedata(workspace_id: String, data: WorkspaceSaveData) -> Result<()> {
    let mut workspace_registry = get_workspace_registry_mut().await;
    workspace_registry.set_workspace_savedata(&workspace_id, data)?;

    Ok(())
}

#[command("workspace.registry")]
async fn get_workspace_settings(workspace_id: String) -> Result<serde_json::Value> {
    let workspace_registry = get_workspace_registry().await;
    let settings = workspace_registry.get_workspace_settings(&workspace_id)?;

    Ok(serde_json::json!(settings))
}

#[command("workspace.registry")]
async fn set_workspace_settings(
    workspace_id: String,
    settings: WorkspaceSettings,
) -> Result<serde_json::Value> {
    let settings = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry.set_workspace_settings(&workspace_id, settings)?
    };

    let open_workspace = {
        let workspace_runtime = get_workspace_runtime().await;
        workspace_runtime.get_open_workspace(&workspace_id)
    };

    if let Some(open_workspace) = open_workspace {
        open_workspace.apply_settings(&settings).await?;
    }

    Ok(serde_json::json!(settings))
}

use std::{
    path::{Path, PathBuf},
    sync::{Arc, LazyLock},
};

use tokio::sync::RwLock;

use crate::config::app_path;

use super::error::WorkspaceError;

pub static WORKSPACE_CONFIG_FOLDER: &str = ".lonanote";
pub static WORKSPACE_FILE: &str = "workspace.json";
pub static WORKSPACE_INDEX_FILE: &str = "index.json";

pub static INDEXING: LazyLock<Arc<RwLock<bool>>> = LazyLock::new(|| Arc::new(RwLock::new(false)));

pub fn get_workspace_global_config_path() -> PathBuf {
    let path = app_path::get_data_dir();
    PathBuf::from(path).join("workspaces.json")
}

pub fn get_workspace_config_path(workspace_path: impl AsRef<Path>) -> PathBuf {
    let path = workspace_path.as_ref();
    path.join(WORKSPACE_CONFIG_FOLDER).join(WORKSPACE_FILE)
}

pub fn get_workspace_index_path(workspace_path: impl AsRef<Path>) -> PathBuf {
    let path = workspace_path.as_ref();
    path.join(WORKSPACE_CONFIG_FOLDER)
        .join(WORKSPACE_INDEX_FILE)
}

pub fn create_workspace_config_folder(
    workspace_path: impl AsRef<Path>,
) -> Result<(), WorkspaceError> {
    let path = workspace_path.as_ref();
    let folder = path.join(WORKSPACE_CONFIG_FOLDER);
    if !folder.exists() {
        std::fs::create_dir_all(folder).map_err(|err| WorkspaceError::IOError(err.to_string()))?;
    }

    Ok(())
}

pub async fn get_indexing() -> bool {
    *INDEXING.read().await
}

pub async fn set_indexing(indexing: bool) {
    *INDEXING.write().await = indexing;
}

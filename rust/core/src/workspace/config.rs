use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Arc, LazyLock},
};

use serde::{de, Serialize};
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

pub fn from_json_config<T>(
    workspace_path: impl AsRef<Path>,
    file: &str,
) -> Result<Option<T>, WorkspaceError>
where
    T: for<'a> de::Deserialize<'a>,
{
    create_workspace_config_folder(&workspace_path)?;
    let path = workspace_path.as_ref();
    let config_path = path.join(WORKSPACE_CONFIG_FOLDER).join(file);
    if config_path.exists() {
        let data = fs::read_to_string(config_path)
            .map_err(|err| WorkspaceError::IOError(err.to_string()))?;
        let index = serde_json::from_str::<T>(&data)
            .map_err(|err| WorkspaceError::ParseConfigError(err.to_string()))?;

        Ok(Some(index))
    } else {
        Ok(None)
    }
}

pub fn save_json_config<T>(
    workspace_path: impl AsRef<Path>,
    file: &str,
    value: &T,
) -> Result<(), WorkspaceError>
where
    T: ?Sized + Serialize,
{
    create_workspace_config_folder(&workspace_path)?;
    let path = workspace_path.as_ref();
    let config_path = path.join(WORKSPACE_CONFIG_FOLDER).join(file);
    let s = serde_json::to_string_pretty(value)
        .map_err(|err| WorkspaceError::JsonError(err.to_string()))?;
    std::fs::write(config_path, s).map_err(|err| WorkspaceError::IOError(err.to_string()))?;

    Ok(())
}

pub async fn get_indexing() -> bool {
    *INDEXING.read().await
}

pub async fn set_indexing(indexing: bool) {
    *INDEXING.write().await = indexing;
}

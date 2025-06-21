use std::{fs, path::PathBuf};

use serde::{de, Serialize};

use crate::config::app_path;

use super::{error::WorkspaceError, workspace_path::WorkspacePath};

use rust_embed::RustEmbed;

#[derive(RustEmbed)]
#[folder = "assets/default_workspace"]
pub struct DefaultWorkspace;

pub static WORKSPACE_CONFIG_FOLDER: &str = ".lonanote";
pub static WORKSPACE_SETTINGS_FILE: &str = "workspace.json";
pub static DEFAULT_GIT_IGNORE: &str = include_str!("../../assets/default_gitignore.txt");

pub fn get_workspace_global_config_path() -> PathBuf {
    let path = app_path::get_data_dir();
    PathBuf::from(path).join("workspaces.json")
}

pub fn create_workspace_init_files(workspace_path: &WorkspacePath) -> Result<(), WorkspaceError> {
    let path = workspace_path.to_path_buf_cow();
    let folder = path.join(WORKSPACE_CONFIG_FOLDER);
    let gitignore_path = folder.join(".gitignore");
    if !gitignore_path.exists() {
        fs::write(gitignore_path, DEFAULT_GIT_IGNORE)
            .map_err(|err| WorkspaceError::IOError(err.to_string()))?;
    }

    Ok(())
}

pub fn create_workspace_config_folder(
    workspace_path: &WorkspacePath,
) -> Result<(), WorkspaceError> {
    let path = workspace_path.to_path_buf_cow();
    let folder = path.join(WORKSPACE_CONFIG_FOLDER);
    if !folder.exists() {
        std::fs::create_dir_all(folder).map_err(|err| WorkspaceError::IOError(err.to_string()))?;
    }

    Ok(())
}

pub fn from_json_config<T>(
    workspace_path: &WorkspacePath,
    file: &str,
) -> Result<Option<T>, WorkspaceError>
where
    T: for<'a> de::Deserialize<'a>,
{
    create_workspace_config_folder(workspace_path)?;
    let path = workspace_path.to_path_buf_cow();
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
    workspace_path: &WorkspacePath,
    file: &str,
    value: &T,
) -> Result<(), WorkspaceError>
where
    T: ?Sized + Serialize,
{
    create_workspace_config_folder(workspace_path)?;
    let path = workspace_path.to_path_buf_cow();
    let config_path = path.join(WORKSPACE_CONFIG_FOLDER).join(file);
    let s = serde_json::to_string_pretty(value)
        .map_err(|err| WorkspaceError::JsonError(err.to_string()))?;
    std::fs::write(config_path, s).map_err(|err| WorkspaceError::IOError(err.to_string()))?;

    Ok(())
}

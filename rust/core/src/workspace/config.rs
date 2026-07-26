use std::path::PathBuf;

use rust_embed::Embed;
use serde::{de::DeserializeOwned, Serialize};

use crate::config::app_path;

use super::{
    error::WorkspaceError,
    storage::{WorkspaceStorage, WriteOptions},
    workspace_manifest::{WorkspaceManifest, WORKSPACE_MANIFEST_SCHEMA_VERSION},
    workspace_relative_path::WorkspaceRelativePath,
};

#[derive(Embed)]
#[folder = "assets/default_workspace/"]
pub struct DefaultWorkspace;

pub const WORKSPACE_CONFIG_FOLDER: &str = ".lonanote";
pub const WORKSPACE_SETTINGS_FILE: &str = "workspace.json";
pub const DEFAULT_GIT_IGNORE: &str = include_str!("../../assets/default_gitignore.txt");

pub fn get_workspace_global_config_path() -> PathBuf {
    PathBuf::from(app_path::get_data_dir()).join("workspaces.json")
}

pub async fn load_workspace_manifest(
    storage: &dyn WorkspaceStorage,
) -> Result<Option<WorkspaceManifest>, WorkspaceError> {
    let path = manifest_path();
    if !storage.exists(&path).await? {
        return Ok(None);
    }

    let manifest = read_json(storage, &path).await?;
    Ok(Some(manifest))
}

pub async fn save_workspace_manifest(
    storage: &dyn WorkspaceStorage,
    manifest: &WorkspaceManifest,
) -> Result<(), WorkspaceError> {
    if manifest.schema_version != WORKSPACE_MANIFEST_SCHEMA_VERSION {
        return Err(WorkspaceError::UnsupportedManifestSchema(
            manifest.schema_version,
        ));
    }

    let config_dir = WorkspaceRelativePath::parse(WORKSPACE_CONFIG_FOLDER)?;
    storage.create_dir_all(&config_dir).await?;
    write_json(storage, &manifest_path(), manifest).await
}

pub async fn initialize_workspace_files(
    storage: &dyn WorkspaceStorage,
    manifest: &WorkspaceManifest,
) -> Result<(), WorkspaceError> {
    save_workspace_manifest(storage, manifest).await?;

    let gitignore = WorkspaceRelativePath::parse(format!("{WORKSPACE_CONFIG_FOLDER}/.gitignore"))?;
    if !storage.exists(&gitignore).await? {
        storage
            .write(
                &gitignore,
                DEFAULT_GIT_IGNORE.as_bytes(),
                WriteOptions {
                    overwrite: false,
                    create_parent: true,
                },
            )
            .await?;
    }

    for file_path in DefaultWorkspace::iter() {
        let path = WorkspaceRelativePath::parse(file_path.as_ref())?;
        if storage.exists(&path).await? {
            continue;
        }
        if let Some(file) = DefaultWorkspace::get(file_path.as_ref()) {
            storage
                .write(
                    &path,
                    file.data.as_ref(),
                    WriteOptions {
                        overwrite: false,
                        create_parent: true,
                    },
                )
                .await?;
        }
    }

    Ok(())
}

async fn read_json<T>(
    storage: &dyn WorkspaceStorage,
    path: &WorkspaceRelativePath,
) -> Result<T, WorkspaceError>
where
    T: DeserializeOwned,
{
    let data = storage.read(path).await?;
    serde_json::from_slice(&data).map_err(|error| WorkspaceError::Json(error.to_string()))
}

async fn write_json<T>(
    storage: &dyn WorkspaceStorage,
    path: &WorkspaceRelativePath,
    value: &T,
) -> Result<(), WorkspaceError>
where
    T: ?Sized + Serialize,
{
    let data = serde_json::to_vec_pretty(value)
        .map_err(|error| WorkspaceError::Json(error.to_string()))?;
    storage
        .write(path, &data, WriteOptions::default())
        .await
        .map_err(WorkspaceError::from)
}

fn manifest_path() -> WorkspaceRelativePath {
    WorkspaceRelativePath::parse(format!(
        "{WORKSPACE_CONFIG_FOLDER}/{WORKSPACE_SETTINGS_FILE}"
    ))
    .expect("静态 manifest 路径必须合法")
}

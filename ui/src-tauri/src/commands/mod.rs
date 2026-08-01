mod api;
mod invoke;

use anyhow::{anyhow, Result};
use invoke::*;
use lonanote_core::workspace::{
    install_workspace_manager, LocalFsResolver, StorageProviderId, WorkspaceManager,
    WorkspaceStorageResolver,
};
use std::{path::PathBuf, sync::Arc};
use tauri::{AppHandle, Builder, Manager, Runtime};

const DOCUMENTS_PROVIDER_ID: &str = "documents";
const DESKTOP_FOLDER_PROVIDER_ID: &str = "desktop-folder";

pub fn resolve_default_paths(app: &AppHandle) -> Result<lonanote_core::config::app_path::AppPaths> {
    fn path_to_string(path: std::path::PathBuf, field: &str) -> Result<String> {
        path.to_str()
            .map(|path| path.to_string())
            .ok_or_else(|| anyhow::anyhow!("{field} is not valid unicode"))
    }

    let resolver = app.path();
    let data_dir = resolver
        .app_data_dir()
        .or_else(|_| resolver.app_local_data_dir())?;
    let cache_dir = resolver
        .app_cache_dir()
        .or_else(|_| resolver.app_local_data_dir())?;
    let home_dir = resolver.home_dir()?;
    let download_dir = resolver.download_dir().unwrap_or_else(|_| home_dir.clone());

    Ok(lonanote_core::config::app_path::AppPaths::new(
        path_to_string(data_dir, "data_dir")?,
        path_to_string(cache_dir, "cache_dir")?,
        path_to_string(download_dir, "download_dir")?,
        path_to_string(home_dir, "home_dir")?,
    ))
}

pub fn reg_commands<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder.invoke_handler(tauri::generate_handler![
        invoke,
        invoke_async,
        get_command_len,
        get_command_keys,
        get_command_async_len,
        get_command_async_keys,
        reg_callback_function,
        unreg_callback_function,
        clear_callback_function,
        get_callback_keys,
        get_callback_len,
        invoke_callback,
    ])
}

pub fn init_commands(app: &AppHandle) -> Result<()> {
    let paths = resolve_default_paths(app)?;
    let data_dir = PathBuf::from(&paths.data_dir);
    lonanote_core::config::app_path::init_paths(paths);
    let managed_root = app.path().document_dir()?.join("LonaNote");
    let storage_resolver = Arc::new(
        LocalFsResolver::new()
            .with_managed_provider(
                StorageProviderId::parse(DOCUMENTS_PROVIDER_ID)?,
                managed_root,
            )
            .with_external_provider(StorageProviderId::parse(DESKTOP_FOLDER_PROVIDER_ID)?),
    ) as Arc<dyn WorkspaceStorageResolver>;
    let workspace_manager =
        tauri::async_runtime::block_on(WorkspaceManager::load(data_dir, storage_resolver))?;
    install_workspace_manager(workspace_manager).map_err(|error| anyhow!(error.to_string()))?;
    lonanote_core::init()?;
    Ok(())
}

mod api;
mod invoke;

use anyhow::{anyhow, Result};
use invoke::*;
use lonanote_core::workspace::{
    install_workspace_manager, LocalFsResolver, StorageProviderId, WorkspaceManager,
    WorkspaceStorageResolver,
};
use std::{path::PathBuf, sync::Arc};
use sys_locale::get_locale;
use tauri::{AppHandle, Builder, Manager, Runtime};

const APP_LOCAL_PROVIDER_ID: &str = "app-local";
const DESKTOP_DOCUMENTS_PROVIDER_ID: &str = "desktop-documents";
const DESKTOP_FOLDER_PROVIDER_ID: &str = "desktop-folder";
const MANAGED_WORKSPACE_DIRECTORY: &str = "lonanote";

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
    lonanote_core::config::system_locale::init_system_locale(get_locale().unwrap_or_default());
    let mut storage_resolver = LocalFsResolver::new()
        .with_managed_provider(
            StorageProviderId::parse(APP_LOCAL_PROVIDER_ID)?,
            data_dir.clone(),
        )
        .with_external_provider(StorageProviderId::parse(DESKTOP_FOLDER_PROVIDER_ID)?);
    if let Ok(documents_dir) = app.path().document_dir() {
        storage_resolver = storage_resolver.with_managed_provider(
            StorageProviderId::parse(DESKTOP_DOCUMENTS_PROVIDER_ID)?,
            documents_dir.join(MANAGED_WORKSPACE_DIRECTORY),
        );
    }
    let storage_resolver = Arc::new(storage_resolver) as Arc<dyn WorkspaceStorageResolver>;
    let workspace_manager =
        tauri::async_runtime::block_on(WorkspaceManager::load(data_dir, storage_resolver))?;
    tauri::async_runtime::block_on(
        workspace_manager
            .create_initial_workspace_if_needed(StorageProviderId::parse(APP_LOCAL_PROVIDER_ID)?),
    )?;
    install_workspace_manager(workspace_manager).map_err(|error| anyhow!(error.to_string()))?;
    lonanote_core::init()?;
    Ok(())
}

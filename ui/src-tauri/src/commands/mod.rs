mod invoke;

use anyhow::Result;
use invoke::*;
use tauri::{AppHandle, Builder, Manager, Runtime};

use crate::APP_HANDLE;

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

pub fn init_commands() -> Result<()> {
    let app = APP_HANDLE
        .get()
        .expect("APP_HANDLE not initialized")
        .to_owned();
    let paths = resolve_default_paths(&app)?;
    lonanote_core::config::app_path::init_paths(paths);
    lonanote_core::init()?;
    Ok(())
}

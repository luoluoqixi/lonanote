use anyhow::Result;
use tauri::{
    command,
    plugin::{Builder, TauriPlugin},
    Runtime,
};

use super::{get_data_path, get_local_data_path};

#[command]
fn data_path() -> String {
    get_data_path().to_str().unwrap().to_string()
}
#[command]
fn local_data_path() -> String {
    get_local_data_path().to_str().unwrap().to_string()
}

pub(crate) fn init_plugin<R: Runtime>(app: &tauri::App) -> Result<TauriPlugin<R>> {
    Ok(Builder::new("path")
        .invoke_handler(tauri::generate_handler![data_path, local_data_path,])
        .build())
}

use anyhow::Result;
use tauri::{
    command,
    plugin::{Builder, TauriPlugin},
    Runtime,
};

use super::utils_impl as utils;

#[command]
fn test(path: String) -> String {
    utils::test(path)
}

pub(crate) fn init_plugin<R: Runtime>() -> Result<TauriPlugin<R>> {
    Ok(Builder::new("utils")
        .invoke_handler(tauri::generate_handler![test])
        .build())
}

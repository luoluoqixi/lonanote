use std::path::PathBuf;

use tauri::{AppHandle, Manager};

use crate::APP_HANDLE;

pub fn get_data_path() -> PathBuf {
    APP_HANDLE
        .get()
        .unwrap()
        .path()
        .app_data_dir()
        .unwrap()
        .join("appdata")
}

pub fn get_local_data_path() -> PathBuf {
    APP_HANDLE
        .get()
        .unwrap()
        .path()
        .resource_dir()
        .unwrap()
        .join("data")
}

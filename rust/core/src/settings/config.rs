use std::path::PathBuf;

use crate::config::app_path;

pub fn get_settings_config_path() -> PathBuf {
    let path = app_path::get_data_dir();
    PathBuf::from(path).join("settings.json")
}

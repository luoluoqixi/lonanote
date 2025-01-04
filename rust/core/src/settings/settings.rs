use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;

use super::config::get_settings_config_path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub auto_update: bool,
    pub auto_open_last_workspace: bool,
}

impl Settings {
    pub fn new() -> Self {
        let config_path = get_settings_config_path();
        if config_path.exists() {
            let data = fs::read_to_string(config_path).expect("read settings config error");
            let manager = serde_json::from_str::<Settings>(&data);
            if manager.is_ok() {
                return manager.unwrap();
            } else {
                if cfg!(debug_assertions) {
                    eprintln!("Error parsing settings json: {:?}", manager.err());
                }
            }
        }
        return Self {
            auto_update: true,
            auto_open_last_workspace: true,
        };
    }

    pub fn save(&self) -> Result<()> {
        let config_path = get_settings_config_path();
        let parent = config_path.parent().unwrap();
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
        let s = serde_json::to_string(self)?;
        fs::write(config_path, s)?;

        Ok(())
    }
}

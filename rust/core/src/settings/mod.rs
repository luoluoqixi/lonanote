mod config;

use anyhow::Result;
use config::get_settings_config_path;
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::{Arc, LazyLock};
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub auto_check_update: bool,
    pub auto_open_last_workspace: bool,
}

impl Settings {
    pub fn new() -> Self {
        let config_path = get_settings_config_path();
        if config_path.exists() {
            let data = fs::read_to_string(config_path).expect("read settings config error");
            let manager = serde_json::from_str::<Settings>(&data);
            if let Ok(manager) = manager {
                return manager;
            } else if cfg!(debug_assertions) {
                eprintln!("Error parsing settings json: {:?}", manager.err());
            }
        }
        Self {
            auto_check_update: true,
            auto_open_last_workspace: true,
        }
    }

    pub fn save(&self) -> Result<()> {
        let config_path = get_settings_config_path();
        let parent = config_path.parent().unwrap();
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
        let s = serde_json::to_string_pretty(self)?;
        fs::write(config_path, s)?;

        Ok(())
    }
}

static SETTINGS: LazyLock<Arc<RwLock<Settings>>> =
    LazyLock::new(|| Arc::new(RwLock::new(Settings::new())));

pub async fn get_settings() -> RwLockReadGuard<'static, Settings> {
    SETTINGS.read().await
}

pub async fn get_settings_mut() -> RwLockWriteGuard<'static, Settings> {
    SETTINGS.write().await
}

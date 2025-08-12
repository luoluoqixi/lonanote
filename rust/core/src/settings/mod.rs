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
    /// 是否是第一次启动
    #[serde(default = "Settings::default_first_setup")]
    pub first_setup: bool,
    /// 自动检查更新
    #[serde(default = "Settings::default_auto_check_update")]
    pub auto_check_update: bool,
    /// 自动打开上次的工作区
    #[serde(default = "Settings::default_auto_open_last_workspace")]
    pub auto_open_last_workspace: bool,
    /// 自动保存
    #[serde(default = "Settings::default_auto_save")]
    pub auto_save: bool,
    /// 自动保存的时间间隔, 秒
    #[serde(default = "Settings::default_auto_save_interval")]
    pub auto_save_interval: f64,
    /// 编辑器失去焦点时自动保存
    #[serde(default = "Settings::default_auto_save_focus_change")]
    pub auto_save_focus_change: bool,
    /// 显示行号
    #[serde(default = "Settings::default_show_line_number")]
    pub show_line_number: bool,
    /// 禁用自动换行
    #[serde(default = "Settings::default_disable_line_wrap")]
    pub disable_line_wrap: bool,
}

impl Settings {
    pub const fn default_first_setup() -> bool {
        true
    }

    pub const fn default_auto_check_update() -> bool {
        true
    }

    pub const fn default_auto_open_last_workspace() -> bool {
        true
    }

    pub const fn default_auto_save() -> bool {
        true
    }

    pub const fn default_auto_save_interval() -> f64 {
        1.0
    }

    pub const fn default_auto_save_focus_change() -> bool {
        true
    }

    pub const fn default_show_line_number() -> bool {
        false
    }

    pub const fn default_disable_line_wrap() -> bool {
        false
    }
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
            first_setup: Settings::default_first_setup(),
            auto_check_update: Settings::default_auto_check_update(),
            auto_open_last_workspace: Settings::default_auto_open_last_workspace(),
            auto_save: Settings::default_auto_save(),
            auto_save_interval: Settings::default_auto_save_interval(),
            auto_save_focus_change: Settings::default_auto_save_focus_change(),
            show_line_number: Settings::default_show_line_number(),
            disable_line_wrap: Settings::default_disable_line_wrap(),
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

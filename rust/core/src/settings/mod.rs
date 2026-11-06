mod config;

use anyhow::{anyhow, Result};
use config::get_settings_config_path;
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::{Arc, LazyLock};
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use crate::{
    config::config_sync::{config_sync_hub, ConfigSnapshot, ConfigSyncHub},
    workspace::persistence::json_file::write_json_bytes_atomically,
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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
    /// 源码模式
    #[serde(default = "Settings::default_source_mode")]
    pub source_mode: bool,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SettingsPatch {
    pub first_setup: Option<bool>,
    pub auto_check_update: Option<bool>,
    pub auto_open_last_workspace: Option<bool>,
    pub auto_save: Option<bool>,
    pub auto_save_interval: Option<f64>,
    pub auto_save_focus_change: Option<bool>,
    pub show_line_number: Option<bool>,
    pub disable_line_wrap: Option<bool>,
    pub source_mode: Option<bool>,
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

    pub const fn default_source_mode() -> bool {
        false
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            first_setup: Self::default_first_setup(),
            auto_check_update: Self::default_auto_check_update(),
            auto_open_last_workspace: Self::default_auto_open_last_workspace(),
            auto_save: Self::default_auto_save(),
            auto_save_interval: Self::default_auto_save_interval(),
            auto_save_focus_change: Self::default_auto_save_focus_change(),
            show_line_number: Self::default_show_line_number(),
            disable_line_wrap: Self::default_disable_line_wrap(),
            source_mode: Self::default_source_mode(),
        }
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
        Self::default()
    }

    pub fn save(&self) -> Result<()> {
        let config_path = get_settings_config_path();
        self.save_to(&config_path)?;
        Ok(())
    }

    pub fn apply_patch(&self, patch: &SettingsPatch) -> Result<Self> {
        if let Some(interval) = patch.auto_save_interval {
            if !interval.is_finite() || interval <= 0.0 {
                return Err(anyhow!("autoSaveInterval must be a finite positive number"));
            }
        }
        let mut next = self.clone();
        macro_rules! assign_if_some {
            ($field:ident) => {
                if let Some(value) = patch.$field {
                    next.$field = value;
                }
            };
        }
        assign_if_some!(first_setup);
        assign_if_some!(auto_check_update);
        assign_if_some!(auto_open_last_workspace);
        assign_if_some!(auto_save);
        assign_if_some!(auto_save_interval);
        assign_if_some!(auto_save_focus_change);
        assign_if_some!(show_line_number);
        assign_if_some!(disable_line_wrap);
        assign_if_some!(source_mode);
        Ok(next)
    }

    fn save_to(&self, path: &std::path::Path) -> Result<()> {
        let bytes = serde_json::to_vec_pretty(self)?;
        write_json_bytes_atomically(path, &bytes, "GlobalSettings")?;
        Ok(())
    }

    fn patch_and_save(
        &mut self,
        patch: &SettingsPatch,
        path: &std::path::Path,
        sync_hub: &ConfigSyncHub,
    ) -> Result<ConfigSnapshot<Settings>> {
        let candidate = self.apply_patch(patch)?;
        if candidate == *self {
            return Ok(sync_hub.global_settings_snapshot(self.clone()));
        }
        candidate.save_to(path)?;
        *self = candidate;
        Ok(sync_hub.commit_global_settings(self.clone()))
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

pub async fn patch_settings_and_save(patch: SettingsPatch) -> Result<ConfigSnapshot<Settings>> {
    let mut settings = get_settings_mut().await;
    settings.patch_and_save(&patch, &get_settings_config_path(), config_sync_hub())
}

pub async fn replace_settings_and_save(
    settings_value: Settings,
) -> Result<ConfigSnapshot<Settings>> {
    let mut settings = get_settings_mut().await;
    let patch = SettingsPatch {
        first_setup: Some(settings_value.first_setup),
        auto_check_update: Some(settings_value.auto_check_update),
        auto_open_last_workspace: Some(settings_value.auto_open_last_workspace),
        auto_save: Some(settings_value.auto_save),
        auto_save_interval: Some(settings_value.auto_save_interval),
        auto_save_focus_change: Some(settings_value.auto_save_focus_change),
        show_line_number: Some(settings_value.show_line_number),
        disable_line_wrap: Some(settings_value.disable_line_wrap),
        source_mode: Some(settings_value.source_mode),
    };
    settings.patch_and_save(&patch, &get_settings_config_path(), config_sync_hub())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use serde_json::json;

    use crate::config::config_sync::{ConfigChangedEvent, ConfigSyncHub};

    use super::{Settings, SettingsPatch};

    #[test]
    fn settings_patch_preserves_unmentioned_fields() {
        let current = Settings {
            auto_save: false,
            show_line_number: true,
            ..Settings::default()
        };

        let next = current
            .apply_patch(&SettingsPatch {
                auto_open_last_workspace: Some(false),
                ..SettingsPatch::default()
            })
            .unwrap();

        assert!(!next.auto_save);
        assert!(next.show_line_number);
        assert!(!next.auto_open_last_workspace);
    }

    #[test]
    fn settings_patch_same_value_does_not_bump_revision() {
        let temp = tempfile::tempdir().unwrap();
        let mut settings = Settings::default();
        let hub = ConfigSyncHub::new();
        let mut receiver = hub.subscribe_config_changes();

        let snapshot = settings
            .patch_and_save(
                &SettingsPatch {
                    auto_save: Some(settings.auto_save),
                    ..SettingsPatch::default()
                },
                &temp.path().join("settings.json"),
                &hub,
            )
            .unwrap();

        assert_eq!(snapshot.revision, 0);
        assert!(receiver.try_recv().is_err());
        assert!(!temp.path().join("settings.json").exists());
    }

    #[test]
    fn settings_patch_persists_before_publish() {
        let temp = tempfile::tempdir().unwrap();
        let path = temp.path().join("settings.json");
        let mut settings = Settings::default();
        let hub = ConfigSyncHub::new();
        let mut receiver = hub.subscribe_config_changes();

        let snapshot = settings
            .patch_and_save(
                &SettingsPatch {
                    show_line_number: Some(true),
                    ..SettingsPatch::default()
                },
                &path,
                &hub,
            )
            .unwrap();

        assert!(path.exists());
        let event = receiver.try_recv().unwrap();
        match event {
            ConfigChangedEvent::GlobalSettings(event_snapshot) => {
                assert_eq!(event_snapshot.revision, snapshot.revision);
                assert!(event_snapshot.values.show_line_number);
            }
            ConfigChangedEvent::CommonStore(_) => panic!("expected settings event"),
        }
    }

    #[test]
    fn settings_patch_save_failure_preserves_authoritative_settings() {
        let temp = tempfile::tempdir().unwrap();
        let blocked = temp.path().join("blocked");
        fs::write(&blocked, "file").unwrap();
        let path = blocked.join("settings.json");
        let mut settings = Settings::default();
        let hub = ConfigSyncHub::new();
        let mut receiver = hub.subscribe_config_changes();

        let result = settings.patch_and_save(
            &SettingsPatch {
                show_line_number: Some(true),
                ..SettingsPatch::default()
            },
            &path,
            &hub,
        );

        assert!(result.is_err());
        assert!(!settings.show_line_number);
        assert_eq!(hub.global_settings_snapshot(settings.clone()).revision, 0);
        assert!(receiver.try_recv().is_err());
    }

    #[test]
    fn settings_patch_rejects_non_finite_or_non_positive_interval() {
        let current = Settings::default();
        for invalid in [f64::NAN, f64::INFINITY, 0.0, -1.0] {
            assert!(current
                .apply_patch(&SettingsPatch {
                    auto_save_interval: Some(invalid),
                    ..SettingsPatch::default()
                })
                .is_err());
        }
    }

    #[test]
    fn settings_patch_serialization_uses_typed_camel_case_fields() {
        let patch: SettingsPatch =
            serde_json::from_value(json!({ "showLineNumber": true })).unwrap();
        assert_eq!(patch.show_line_number, Some(true));
        assert!(serde_json::from_value::<SettingsPatch>(json!({ "unknown": true })).is_err());
    }
}

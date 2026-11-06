use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        LazyLock,
    },
};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::broadcast;

use crate::settings::Settings;

const CONFIG_EVENT_CAPACITY: usize = 128;

/// 配置域的完整已提交快照。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigSnapshot<T> {
    pub runtime_id: String,
    pub revision: u64,
    pub values: T,
}

impl<T> ConfigSnapshot<T> {
    pub fn is_newer_than<U>(&self, other: &ConfigSnapshot<U>) -> bool {
        self.runtime_id == other.runtime_id && self.revision > other.revision
    }
}

/// 仅包含持久化成功后的配置变化。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "domain", content = "snapshot", rename_all = "camelCase")]
pub enum ConfigChangedEvent {
    CommonStore(ConfigSnapshot<HashMap<String, Value>>),
    GlobalSettings(ConfigSnapshot<Settings>),
}

/// 为两个配置域分配独立版本，并将已提交快照通知给平台适配层。
pub struct ConfigSyncHub {
    runtime_id: String,
    common_store_revision: AtomicU64,
    global_settings_revision: AtomicU64,
    changes: broadcast::Sender<ConfigChangedEvent>,
}

impl ConfigSyncHub {
    pub fn new() -> Self {
        Self::with_runtime_id(uuid::Uuid::new_v4().to_string())
    }

    fn with_runtime_id(runtime_id: String) -> Self {
        let (changes, _) = broadcast::channel(CONFIG_EVENT_CAPACITY);
        Self {
            runtime_id,
            common_store_revision: AtomicU64::new(0),
            global_settings_revision: AtomicU64::new(0),
            changes,
        }
    }

    pub fn subscribe_config_changes(&self) -> broadcast::Receiver<ConfigChangedEvent> {
        self.changes.subscribe()
    }

    pub fn common_store_snapshot(
        &self,
        values: HashMap<String, Value>,
    ) -> ConfigSnapshot<HashMap<String, Value>> {
        ConfigSnapshot {
            runtime_id: self.runtime_id.clone(),
            revision: self.common_store_revision.load(Ordering::Acquire),
            values,
        }
    }

    pub fn global_settings_snapshot(&self, values: Settings) -> ConfigSnapshot<Settings> {
        ConfigSnapshot {
            runtime_id: self.runtime_id.clone(),
            revision: self.global_settings_revision.load(Ordering::Acquire),
            values,
        }
    }

    /// 持久化完成后调用，分配版本并发布不可变快照。
    pub fn commit_common_store(
        &self,
        values: HashMap<String, Value>,
    ) -> ConfigSnapshot<HashMap<String, Value>> {
        let snapshot = ConfigSnapshot {
            runtime_id: self.runtime_id.clone(),
            revision: self.common_store_revision.fetch_add(1, Ordering::AcqRel) + 1,
            values,
        };
        let _ = self
            .changes
            .send(ConfigChangedEvent::CommonStore(snapshot.clone()));
        snapshot
    }

    /// 持久化完成后调用，分配版本并发布不可变快照。
    pub fn commit_global_settings(&self, values: Settings) -> ConfigSnapshot<Settings> {
        let snapshot = ConfigSnapshot {
            runtime_id: self.runtime_id.clone(),
            revision: self.global_settings_revision.fetch_add(1, Ordering::AcqRel) + 1,
            values,
        };
        let _ = self
            .changes
            .send(ConfigChangedEvent::GlobalSettings(snapshot.clone()));
        snapshot
    }
}

impl Default for ConfigSyncHub {
    fn default() -> Self {
        Self::new()
    }
}

static CONFIG_SYNC_HUB: LazyLock<ConfigSyncHub> = LazyLock::new(ConfigSyncHub::new);

pub fn config_sync_hub() -> &'static ConfigSyncHub {
    &CONFIG_SYNC_HUB
}

pub fn subscribe_config_changes() -> broadcast::Receiver<ConfigChangedEvent> {
    config_sync_hub().subscribe_config_changes()
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use serde_json::json;

    use super::{ConfigChangedEvent, ConfigSnapshot, ConfigSyncHub};
    use crate::settings::Settings;

    #[tokio::test]
    async fn snapshot_revision_starts_at_zero_per_domain() {
        let hub = ConfigSyncHub::with_runtime_id("runtime-a".to_string());

        let common = hub.common_store_snapshot(HashMap::new());
        let settings = hub.global_settings_snapshot(Settings::default());

        assert_eq!(common.revision, 0);
        assert_eq!(settings.revision, 0);
        assert_eq!(common.runtime_id, settings.runtime_id);
    }

    #[tokio::test]
    async fn commit_increments_only_changed_domain() {
        let hub = ConfigSyncHub::with_runtime_id("runtime-a".to_string());

        let common = hub.commit_common_store(HashMap::from([("theme".to_string(), json!("dark"))]));
        let common_after_commit = hub.common_store_snapshot(common.values.clone());
        let settings = hub.global_settings_snapshot(Settings::default());

        assert_eq!(common.revision, 1);
        assert_eq!(common_after_commit.revision, 1);
        assert_eq!(settings.revision, 0);
    }

    #[tokio::test]
    async fn subscriber_receives_immutable_snapshot() {
        let hub = ConfigSyncHub::with_runtime_id("runtime-a".to_string());
        let mut receiver = hub.subscribe_config_changes();
        let mut values = HashMap::new();
        values.insert("theme".to_string(), json!("dark"));

        let committed = hub.commit_common_store(values.clone());
        values.insert("theme".to_string(), json!("light"));
        hub.commit_common_store(values);

        let event = receiver
            .recv()
            .await
            .expect("the committed snapshot is published");
        match event {
            ConfigChangedEvent::CommonStore(snapshot) => {
                assert_eq!(snapshot.revision, committed.revision);
                assert_eq!(snapshot.values.get("theme"), Some(&json!("dark")));
            }
            ConfigChangedEvent::GlobalSettings(_) => panic!("expected a CommonStore event"),
        }
    }

    #[tokio::test]
    async fn new_runtime_id_rejects_old_revision_comparison() {
        let old_hub = ConfigSyncHub::with_runtime_id("runtime-old".to_string());
        let new_hub = ConfigSyncHub::with_runtime_id("runtime-new".to_string());
        let old = old_hub.commit_common_store(HashMap::new());
        let new = new_hub.common_store_snapshot(HashMap::new());

        assert_eq!(old.revision, 1);
        assert_eq!(new.revision, 0);
        assert!(!new.is_newer_than(&old));
        assert!(!old.is_newer_than(&new));
    }

    #[test]
    fn runtime_comparison_requires_matching_runtime_id() {
        let old = ConfigSnapshot {
            runtime_id: "a".to_string(),
            revision: 10,
            values: (),
        };
        let new = ConfigSnapshot {
            runtime_id: "b".to_string(),
            revision: 0,
            values: (),
        };

        assert!(!new.is_newer_than(&old));
        assert!(!old.is_newer_than(&new));
    }
}

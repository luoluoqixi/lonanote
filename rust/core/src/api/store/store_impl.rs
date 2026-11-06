#![allow(dead_code)]

use anyhow::{anyhow, Result};
use std::{
    collections::HashMap,
    ffi::OsStr,
    path::PathBuf,
    sync::{Arc, LazyLock, RwLock, RwLockReadGuard, RwLockWriteGuard},
};

use crate::{
    config::config_sync::{config_sync_hub, ConfigSnapshot, ConfigSyncHub},
    workspace::persistence::json_file::write_json_bytes_atomically,
};
use serde_json::Value;

use crate::config::app_path::get_data_dir;

pub struct Store {
    file_path: PathBuf,
    file_name: String,
    data: HashMap<String, Value>,
    pretty: bool,
}

impl Clone for Store {
    fn clone(&self) -> Self {
        Self {
            file_path: self.file_path.clone(),
            file_name: self.file_name.clone(),
            data: self.data.clone(),
            pretty: self.pretty,
        }
    }
}

impl Store {
    pub fn new<S: AsRef<OsStr>>(file_path: S, pretty: bool) -> Store {
        let file_path = PathBuf::from(file_path.as_ref());
        let file_name = file_path.file_name().unwrap().to_str().unwrap().to_string();
        // 如果是相对目录, 则指向数据目录
        let file_path = if file_path.is_relative() {
            PathBuf::from(get_data_dir()).join(file_path)
        } else {
            file_path
        };
        let mut result = Self {
            file_name,
            file_path,
            pretty,
            data: HashMap::new(),
        };
        result.reload().unwrap_or_else(|err| {
            log::error!("init store [{}] error: {}", result.file_name, err);
        });
        result
    }
    pub fn file_path(&self) -> &PathBuf {
        &self.file_path
    }
    pub fn file_name(&self) -> &String {
        &self.file_name
    }
    pub fn reload(&mut self) -> Result<()> {
        let mut candidate = HashMap::new();
        if self.file_path.exists() {
            let s = std::fs::read_to_string(&self.file_path)?;
            let v = serde_json::from_str::<Value>(s.as_str())?;
            match v.as_object() {
                Some(v) => {
                    for (key, val) in v.iter() {
                        candidate.insert(key.clone(), val.clone());
                    }
                }
                None => return Err(anyhow!("store file must contain a JSON object")),
            }
        }
        self.data = candidate;
        Ok(())
    }
    pub fn save(&self) -> Result<()> {
        self.persist_data(&self.data)
    }

    pub fn patch_and_save(
        &mut self,
        set: HashMap<String, Value>,
        remove: Vec<String>,
        sync_hub: &ConfigSyncHub,
    ) -> Result<ConfigSnapshot<HashMap<String, Value>>> {
        let mut remove_keys = std::collections::HashSet::new();
        for key in &remove {
            if !remove_keys.insert(key) || set.contains_key(key) {
                return Err(anyhow!("CommonStore patch contains a set/remove collision"));
            }
        }

        let mut candidate = self.data.clone();
        for key in remove {
            candidate.remove(&key);
        }
        for (key, value) in set {
            candidate.insert(key, value);
        }
        if candidate == self.data {
            return Ok(sync_hub.common_store_snapshot(self.data.clone()));
        }

        self.persist_data(&candidate)?;
        self.data = candidate;
        Ok(sync_hub.commit_common_store(self.data.clone()))
    }

    fn persist_data(&self, data: &HashMap<String, Value>) -> Result<()> {
        let json = if self.pretty {
            serde_json::to_vec_pretty(data)?
        } else {
            serde_json::to_vec(data)?
        };
        write_json_bytes_atomically(&self.file_path, &json, &self.file_name)?;
        Ok(())
    }

    pub fn common_snapshot(&self) -> ConfigSnapshot<HashMap<String, Value>> {
        config_sync_hub().common_store_snapshot(self.all())
    }

    pub fn reload_common_and_publish(
        &mut self,
        sync_hub: &ConfigSyncHub,
    ) -> Result<ConfigSnapshot<HashMap<String, Value>>> {
        let mut candidate = HashMap::new();
        if self.file_path.exists() {
            let text = std::fs::read_to_string(&self.file_path)?;
            let value = serde_json::from_str::<Value>(&text)?;
            let object = value
                .as_object()
                .ok_or_else(|| anyhow!("store file must contain a JSON object"))?;
            candidate.extend(
                object
                    .iter()
                    .map(|(key, value)| (key.clone(), value.clone())),
            );
        }
        if candidate == self.data {
            return Ok(sync_hub.common_store_snapshot(self.data.clone()));
        }
        self.data = candidate;
        Ok(sync_hub.commit_common_store(self.data.clone()))
    }
    pub fn clear(&mut self) {
        self.data.clear()
    }
    pub fn delete(&mut self, key: impl AsRef<str>) -> bool {
        self.data.remove(key.as_ref()).is_some()
    }
    pub fn has(&self, key: impl AsRef<str>) -> bool {
        self.data.contains_key(key.as_ref())
    }
    pub fn get(&self, key: impl AsRef<str>) -> Option<Value> {
        self.data.get(key.as_ref()).cloned()
    }
    pub fn set(&mut self, key: impl AsRef<str>, val: &Value) {
        self.data
            .entry(key.as_ref().to_string())
            .and_modify(|e| *e = val.clone())
            .or_insert(val.clone());
    }
    pub fn keys(&self) -> impl Iterator<Item = &String> {
        self.data.keys()
    }
    pub fn values(&self) -> impl Iterator<Item = &Value> {
        self.data.values()
    }
    pub fn len(&self) -> usize {
        self.data.len()
    }
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
    pub fn iter(&self) -> impl Iterator<Item = (&String, &Value)> {
        self.data.iter()
    }
    pub fn all(&self) -> HashMap<String, Value> {
        self.data.clone()
    }
}

pub static STORE_COMMON: LazyLock<Arc<RwLock<Store>>> = LazyLock::new(|| {
    Arc::new(RwLock::new(Store::new(
        PathBuf::from(get_data_dir()).join("store_common.json"),
        true,
    )))
});

pub(crate) fn get_store_mut(store_key: &str) -> Result<RwLockWriteGuard<'static, Store>> {
    if store_key == "STORE_COMMON" {
        Ok(STORE_COMMON.write().unwrap())
    } else {
        Err(anyhow!(
            "get_store Error: notfound store_key: {}",
            store_key
        ))
    }
}

pub(crate) fn get_store(store_key: &str) -> Result<RwLockReadGuard<'static, Store>> {
    if store_key == "STORE_COMMON" {
        Ok(STORE_COMMON.read().unwrap())
    } else {
        Err(anyhow!(
            "get_store Error: notfound store_key: {}",
            store_key
        ))
    }
}

pub fn common() -> Result<RwLockReadGuard<'static, Store>> {
    get_store("STORE_COMMON")
}
pub fn common_mut() -> Result<RwLockWriteGuard<'static, Store>> {
    get_store_mut("STORE_COMMON")
}

#[cfg(test)]
mod tests {
    use std::{collections::HashMap, fs};

    use serde_json::{json, Value};

    use crate::config::config_sync::ConfigSyncHub;

    use super::Store;

    fn store_at(path: &std::path::Path, data: HashMap<String, Value>) -> Store {
        Store {
            file_path: path.to_path_buf(),
            file_name: "store_common.json".to_string(),
            data,
            pretty: true,
        }
    }

    #[test]
    fn common_patch_preserves_unmentioned_and_unknown_keys() {
        let temp = tempfile::tempdir().expect("temporary directory");
        let path = temp.path().join("store.json");
        let mut store = store_at(
            &path,
            HashMap::from([
                ("theme".to_string(), json!("light")),
                ("future.setting".to_string(), json!({ "kept": true })),
            ]),
        );
        let hub = ConfigSyncHub::new();

        let snapshot = store
            .patch_and_save(
                HashMap::from([("theme".to_string(), json!("dark"))]),
                vec![],
                &hub,
            )
            .expect("patch persists");

        assert_eq!(snapshot.values.get("theme"), Some(&json!("dark")));
        assert_eq!(
            snapshot.values.get("future.setting"),
            Some(&json!({ "kept": true }))
        );
        let disk: HashMap<String, Value> =
            serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
        assert_eq!(disk, snapshot.values);
    }

    #[test]
    fn common_patch_removes_only_requested_key() {
        let temp = tempfile::tempdir().expect("temporary directory");
        let path = temp.path().join("store.json");
        let mut store = store_at(
            &path,
            HashMap::from([
                ("remove.me".to_string(), json!(true)),
                ("keep.me".to_string(), json!(42)),
            ]),
        );
        let hub = ConfigSyncHub::new();

        let snapshot = store
            .patch_and_save(HashMap::new(), vec!["remove.me".to_string()], &hub)
            .expect("patch persists");

        assert!(!snapshot.values.contains_key("remove.me"));
        assert_eq!(snapshot.values.get("keep.me"), Some(&json!(42)));
    }

    #[test]
    fn common_patch_rejects_set_remove_collision() {
        let temp = tempfile::tempdir().expect("temporary directory");
        let mut store = store_at(&temp.path().join("store.json"), HashMap::new());
        let hub = ConfigSyncHub::new();

        let result = store.patch_and_save(
            HashMap::from([("same".to_string(), json!(1))]),
            vec!["same".to_string()],
            &hub,
        );

        assert!(result.is_err());
        assert!(store.is_empty());
        assert_eq!(hub.common_store_snapshot(store.all()).revision, 0);
    }

    #[test]
    fn common_patch_noop_keeps_revision_and_emits_nothing() {
        let temp = tempfile::tempdir().expect("temporary directory");
        let mut store = store_at(
            &temp.path().join("store.json"),
            HashMap::from([("theme".to_string(), json!("dark"))]),
        );
        let hub = ConfigSyncHub::new();
        let mut receiver = hub.subscribe_config_changes();
        let before = store
            .patch_and_save(
                HashMap::from([("theme".to_string(), json!("dark"))]),
                vec![],
                &hub,
            )
            .unwrap();

        assert_eq!(before.revision, 0);
        assert!(receiver.try_recv().is_err());
    }

    #[test]
    fn common_patch_persistence_failure_keeps_value_revision_and_events() {
        let temp = tempfile::tempdir().expect("temporary directory");
        let blocked_parent = temp.path().join("not-a-directory");
        fs::write(&blocked_parent, "block").unwrap();
        let path = blocked_parent.join("store.json");
        let mut store = store_at(
            &path,
            HashMap::from([("theme".to_string(), json!("light"))]),
        );
        let hub = ConfigSyncHub::new();
        let mut receiver = hub.subscribe_config_changes();

        let result = store.patch_and_save(
            HashMap::from([("theme".to_string(), json!("dark"))]),
            vec![],
            &hub,
        );

        assert!(result.is_err());
        assert_eq!(store.get("theme"), Some(json!("light")));
        assert_eq!(hub.common_store_snapshot(store.all()).revision, 0);
        assert!(receiver.try_recv().is_err());
    }
}

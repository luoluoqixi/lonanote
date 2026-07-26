use std::{
    collections::{BTreeMap, HashMap},
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use async_trait::async_trait;
use tokio::sync::RwLock;

use super::{
    MountedStorage, StorageCapabilities, StorageEntry, StorageEntryKind, StorageEntryMetadata,
    StorageError, WorkspaceStorage, WorkspaceStorageFactory, WriteOptions,
};
use crate::workspace::{
    storage_mount::{StorageMountId, StorageMountRecord},
    workspace_relative_path::WorkspaceRelativePath,
};

#[derive(Debug, Clone)]
struct MemoryEntry {
    kind: StorageEntryKind,
    data: Vec<u8>,
    created_time: u64,
    modified_time: u64,
}

impl MemoryEntry {
    fn directory(now: u64) -> Self {
        Self {
            kind: StorageEntryKind::Directory,
            data: Vec::new(),
            created_time: now,
            modified_time: now,
        }
    }

    fn file(data: &[u8], now: u64) -> Self {
        Self {
            kind: StorageEntryKind::File,
            data: data.to_vec(),
            created_time: now,
            modified_time: now,
        }
    }

    fn metadata(&self) -> StorageEntryMetadata {
        StorageEntryMetadata {
            kind: self.kind,
            size: (self.kind == StorageEntryKind::File).then_some(self.data.len() as u64),
            created_time: Some(self.created_time),
            modified_time: Some(self.modified_time),
        }
    }
}

#[derive(Debug)]
pub struct MemoryStorage {
    entries: RwLock<BTreeMap<WorkspaceRelativePath, MemoryEntry>>,
}

#[derive(Debug, Default)]
pub struct MemoryStorageFactory {
    storages: RwLock<HashMap<StorageMountId, Arc<MemoryStorage>>>,
}

impl MemoryStorageFactory {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn storage(&self, mount_id: &StorageMountId) -> Option<Arc<MemoryStorage>> {
        self.storages.read().await.get(mount_id).cloned()
    }
}

#[async_trait]
impl WorkspaceStorageFactory for MemoryStorageFactory {
    async fn open_mount(&self, mount: &StorageMountRecord) -> Result<MountedStorage, StorageError> {
        let storage = {
            let mut storages = self.storages.write().await;
            Arc::clone(
                storages
                    .entry(mount.id.clone())
                    .or_insert_with(|| Arc::new(MemoryStorage::new())),
            )
        };
        Ok(MountedStorage::new(storage))
    }
}

impl MemoryStorage {
    pub fn new() -> Self {
        let now = now_timestamp();
        let mut entries = BTreeMap::new();
        entries.insert(WorkspaceRelativePath::root(), MemoryEntry::directory(now));
        Self {
            entries: RwLock::new(entries),
        }
    }

    fn ensure_parent_directory(
        entries: &BTreeMap<WorkspaceRelativePath, MemoryEntry>,
        path: &WorkspaceRelativePath,
    ) -> Result<(), StorageError> {
        let parent = path.parent().unwrap_or_else(WorkspaceRelativePath::root);
        match entries.get(&parent) {
            Some(entry) if entry.kind == StorageEntryKind::Directory => Ok(()),
            Some(_) => Err(StorageError::NotDirectory { path: parent }),
            None => Err(StorageError::NotFound { path: parent }),
        }
    }

    fn create_parent_directories(
        entries: &mut BTreeMap<WorkspaceRelativePath, MemoryEntry>,
        path: &WorkspaceRelativePath,
    ) -> Result<(), StorageError> {
        let Some(parent) = path.parent() else {
            return Ok(());
        };

        let mut current = WorkspaceRelativePath::root();
        for component in parent.components() {
            let name = component.parse()?;
            current = current.join_name(&name);
            match entries.get(&current) {
                Some(entry) if entry.kind == StorageEntryKind::Directory => {}
                Some(_) => {
                    return Err(StorageError::NotDirectory {
                        path: current.clone(),
                    });
                }
                None => {
                    entries.insert(current.clone(), MemoryEntry::directory(now_timestamp()));
                }
            }
        }

        Ok(())
    }
}

impl Default for MemoryStorage {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl WorkspaceStorage for MemoryStorage {
    async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
        Ok(StorageCapabilities::memory())
    }

    async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError> {
        Ok(self.entries.read().await.contains_key(path))
    }

    async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError> {
        self.entries
            .read()
            .await
            .get(path)
            .map(MemoryEntry::metadata)
            .ok_or_else(|| StorageError::NotFound { path: path.clone() })
    }

    async fn list_dir(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, StorageError> {
        let entries = self.entries.read().await;
        match entries.get(path) {
            None => return Err(StorageError::NotFound { path: path.clone() }),
            Some(entry) if entry.kind != StorageEntryKind::Directory => {
                return Err(StorageError::NotDirectory { path: path.clone() });
            }
            Some(_) => {}
        }

        Ok(entries
            .iter()
            .filter(|(candidate, _)| candidate.parent().as_ref() == Some(path))
            .map(|(path, entry)| StorageEntry {
                path: path.clone(),
                metadata: entry.metadata(),
            })
            .collect())
    }

    async fn read(&self, path: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError> {
        let entries = self.entries.read().await;
        let entry = entries
            .get(path)
            .ok_or_else(|| StorageError::NotFound { path: path.clone() })?;
        if entry.kind == StorageEntryKind::Directory {
            return Err(StorageError::IsDirectory { path: path.clone() });
        }

        Ok(entry.data.clone())
    }

    async fn write(
        &self,
        path: &WorkspaceRelativePath,
        data: &[u8],
        options: WriteOptions,
    ) -> Result<(), StorageError> {
        if path.is_root() {
            return Err(StorageError::IsDirectory { path: path.clone() });
        }

        let mut entries = self.entries.write().await;
        if options.create_parent {
            Self::create_parent_directories(&mut entries, path)?;
        } else {
            Self::ensure_parent_directory(&entries, path)?;
        }

        if let Some(entry) = entries.get_mut(path) {
            if entry.kind == StorageEntryKind::Directory {
                return Err(StorageError::IsDirectory { path: path.clone() });
            }
            if !options.overwrite {
                return Err(StorageError::AlreadyExists { path: path.clone() });
            }
            entry.data = data.to_vec();
            entry.modified_time = now_timestamp();
            return Ok(());
        }

        entries.insert(path.clone(), MemoryEntry::file(data, now_timestamp()));
        Ok(())
    }

    async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError> {
        let mut entries = self.entries.write().await;
        let mut current = WorkspaceRelativePath::root();
        for component in path.components() {
            let name = component.parse()?;
            current = current.join_name(&name);
            match entries.get(&current) {
                Some(entry) if entry.kind == StorageEntryKind::Directory => {}
                Some(_) => {
                    return Err(StorageError::NotDirectory {
                        path: current.clone(),
                    });
                }
                None => {
                    entries.insert(current.clone(), MemoryEntry::directory(now_timestamp()));
                }
            }
        }
        Ok(())
    }

    async fn rename(
        &self,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), StorageError> {
        if from.is_root() || to.is_root() {
            return Err(StorageError::CannotModifyRoot);
        }
        if to.starts_with(from) {
            return Err(StorageError::Io {
                operation: "rename",
                message: "不能把目录移动到自身内部".to_string(),
            });
        }

        let mut entries = self.entries.write().await;
        if !entries.contains_key(from) {
            return Err(StorageError::NotFound { path: from.clone() });
        }
        if entries.contains_key(to) {
            return Err(StorageError::AlreadyExists { path: to.clone() });
        }
        Self::ensure_parent_directory(&entries, to)?;

        let affected = entries
            .keys()
            .filter(|path| path.starts_with(from))
            .cloned()
            .collect::<Vec<_>>();
        let mut moved = Vec::with_capacity(affected.len());
        for old_path in affected {
            let entry = entries
                .remove(&old_path)
                .expect("affected memory entry must exist");
            let suffix = old_path
                .as_str()
                .strip_prefix(from.as_str())
                .expect("prefix checked")
                .trim_start_matches('/');
            let new_path = if suffix.is_empty() {
                to.clone()
            } else {
                WorkspaceRelativePath::parse(format!("{}/{suffix}", to.as_str()))?
            };
            moved.push((new_path, entry));
        }
        entries.extend(moved);

        Ok(())
    }

    async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), StorageError> {
        if path.is_root() {
            return Err(StorageError::CannotModifyRoot);
        }

        let mut entries = self.entries.write().await;
        let entry = entries
            .get(path)
            .ok_or_else(|| StorageError::NotFound { path: path.clone() })?;
        let has_children = entries.keys().any(|candidate| {
            candidate != path
                && candidate.starts_with(path)
                && candidate.parent().as_ref() == Some(path)
        });
        if entry.kind == StorageEntryKind::Directory && has_children && !recursive {
            return Err(StorageError::DirectoryNotEmpty { path: path.clone() });
        }

        let affected = entries
            .keys()
            .filter(|candidate| candidate.starts_with(path))
            .cloned()
            .collect::<Vec<_>>();
        for candidate in affected {
            entries.remove(&candidate);
        }

        Ok(())
    }
}

fn now_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

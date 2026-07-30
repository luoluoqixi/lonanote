use std::{
    collections::BTreeMap,
    time::{SystemTime, UNIX_EPOCH},
};

use async_trait::async_trait;
use tokio::sync::RwLock;

use super::{
    StorageCapabilities, StorageEntry, StorageEntryKind, StorageEntryMetadata, StorageError,
    WorkspaceStorage, WriteOptions,
};
use crate::workspace::domain::WorkspaceRelativePath;

#[derive(Debug, Clone)]
struct MemoryEntry {
    kind: StorageEntryKind,
    data: Vec<u8>,
    created_at: u64,
    modified_at: u64,
}

impl MemoryEntry {
    fn directory() -> Self {
        let now = now_timestamp();
        Self {
            kind: StorageEntryKind::Directory,
            data: Vec::new(),
            created_at: now,
            modified_at: now,
        }
    }

    fn metadata(&self) -> StorageEntryMetadata {
        StorageEntryMetadata {
            kind: self.kind,
            size: (self.kind == StorageEntryKind::File).then_some(self.data.len() as u64),
            created_at: Some(self.created_at),
            modified_at: Some(self.modified_at),
        }
    }
}

#[derive(Debug, Default)]
pub struct MemoryStorage {
    entries: RwLock<BTreeMap<WorkspaceRelativePath, MemoryEntry>>,
}

impl MemoryStorage {
    pub fn new() -> Self {
        Self::default()
    }

    fn get_entry<'a>(
        entries: &'a BTreeMap<WorkspaceRelativePath, MemoryEntry>,
        path: &WorkspaceRelativePath,
    ) -> Result<&'a MemoryEntry, StorageError> {
        if path.is_root() {
            return Err(StorageError::UnsupportedOperation {
                operation: "memory_root_entry",
            });
        }
        entries
            .get(path)
            .ok_or_else(|| StorageError::NotFound { path: path.clone() })
    }

    fn ensure_parent_directory(
        entries: &BTreeMap<WorkspaceRelativePath, MemoryEntry>,
        path: &WorkspaceRelativePath,
    ) -> Result<(), StorageError> {
        let parent = path.parent().ok_or(StorageError::CannotModifyRoot)?;
        if parent.is_root() {
            return Ok(());
        }
        let entry = entries.get(&parent).ok_or_else(|| StorageError::NotFound {
            path: parent.clone(),
        })?;
        if entry.kind != StorageEntryKind::Directory {
            return Err(StorageError::NotDirectory { path: parent });
        }
        Ok(())
    }
}

#[async_trait]
impl WorkspaceStorage for MemoryStorage {
    async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
        Ok(StorageCapabilities::memory())
    }

    async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError> {
        if path.is_root() {
            return Ok(true);
        }
        Ok(self.entries.read().await.contains_key(path))
    }

    async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError> {
        if path.is_root() {
            return Ok(MemoryEntry::directory().metadata());
        }
        let entries = self.entries.read().await;
        Ok(Self::get_entry(&entries, path)?.metadata())
    }

    async fn list_dir(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, StorageError> {
        let entries = self.entries.read().await;
        if !path.is_root() {
            let entry = Self::get_entry(&entries, path)?;
            if entry.kind != StorageEntryKind::Directory {
                return Err(StorageError::NotDirectory { path: path.clone() });
            }
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
        if path.is_root() {
            return Err(StorageError::IsDirectory { path: path.clone() });
        }
        let entries = self.entries.read().await;
        let entry = Self::get_entry(&entries, path)?;
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
            return Err(StorageError::CannotModifyRoot);
        }
        if options.create_parent {
            if let Some(parent) = path.parent() {
                self.create_dir_all(&parent).await?;
            }
        }
        let mut entries = self.entries.write().await;
        Self::ensure_parent_directory(&entries, path)?;
        if let Some(existing) = entries.get(path) {
            if existing.kind == StorageEntryKind::Directory {
                return Err(StorageError::IsDirectory { path: path.clone() });
            }
            if !options.overwrite {
                return Err(StorageError::AlreadyExists { path: path.clone() });
            }
        }
        let created_at = entries
            .get(path)
            .map(|entry| entry.created_at)
            .unwrap_or_else(now_timestamp);
        entries.insert(
            path.clone(),
            MemoryEntry {
                kind: StorageEntryKind::File,
                data: data.to_vec(),
                created_at,
                modified_at: now_timestamp(),
            },
        );
        Ok(())
    }

    async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError> {
        if path.is_root() {
            return Ok(());
        }
        let mut entries = self.entries.write().await;
        let mut current = WorkspaceRelativePath::root();
        for component in path.components() {
            let child = WorkspaceRelativePath::parse(component)
                .expect("validated component must be a relative path");
            current = current.join(&child);
            if let Some(existing) = entries.get(&current) {
                if existing.kind != StorageEntryKind::Directory {
                    return Err(StorageError::NotDirectory {
                        path: current.clone(),
                    });
                }
            } else {
                entries.insert(current.clone(), MemoryEntry::directory());
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
            return Err(StorageError::UnsupportedOperation {
                operation: "rename_directory_into_itself",
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
            .filter(|candidate| candidate.starts_with(from))
            .cloned()
            .collect::<Vec<_>>();
        let mut moved = Vec::with_capacity(affected.len());
        for old_path in affected {
            let entry = entries
                .remove(&old_path)
                .expect("affected MemoryStorage entry must exist");
            let suffix = old_path
                .strip_prefix(from)
                .expect("affected path must have source prefix");
            moved.push((to.join(&suffix), entry));
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
        let has_descendants = entries
            .keys()
            .any(|candidate| candidate != path && candidate.starts_with(path));
        if entry.kind == StorageEntryKind::Directory && has_descendants && !recursive {
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

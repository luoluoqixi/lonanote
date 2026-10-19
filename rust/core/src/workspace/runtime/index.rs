use super::{index_ignore::IndexIgnore, index_sort};
use crate::workspace::{
    FileType, StorageEntryKind, StorageError, WorkspaceDirectorySnapshot, WorkspaceError,
    WorkspaceIndexEntry, WorkspaceRelativePath, WorkspaceSettings, WorkspaceStorageSession,
};
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
};
use tokio::sync::{Mutex, RwLock};

#[derive(Debug)]
pub struct WorkspaceIndex {
    session: Arc<WorkspaceStorageSession>,
    cache: RwLock<HashMap<WorkspaceRelativePath, WorkspaceDirectorySnapshot>>,
    locks: Mutex<HashMap<WorkspaceRelativePath, Arc<Mutex<()>>>>,
    generation: AtomicU64,
}
impl WorkspaceIndex {
    pub fn new(session: Arc<WorkspaceStorageSession>) -> Self {
        Self {
            session,
            cache: RwLock::new(HashMap::new()),
            locks: Mutex::new(HashMap::new()),
            generation: AtomicU64::new(0),
        }
    }
    pub async fn get_directory(
        &self,
        path: &WorkspaceRelativePath,
        settings: &WorkspaceSettings,
        reload: bool,
    ) -> Result<WorkspaceDirectorySnapshot, WorkspaceError> {
        let lock = self
            .locks
            .lock()
            .await
            .entry(path.clone())
            .or_default()
            .clone();
        let _directory = lock.lock().await;
        if !reload {
            if let Some(cached) = self.cache.read().await.get(path).cloned() {
                return Ok(cached);
            }
        }
        let generation = self.generation.load(Ordering::SeqCst);
        let ignores = IndexIgnore::load(&self.session, path, settings).await?;
        if self.session.metadata(path).await?.kind != StorageEntryKind::Directory {
            return Err(StorageError::NotDirectory { path: path.clone() }.into());
        }
        let mut entries = Vec::new();
        for entry in self.session.list_dir(path).await? {
            let is_dir = entry.metadata.kind == StorageEntryKind::Directory;
            if ignores.hidden(&entry.path, is_dir) {
                continue;
            }
            entries.push(WorkspaceIndexEntry {
                path: entry.path,
                file_type: if is_dir {
                    FileType::Directory
                } else {
                    FileType::File
                },
                last_modified_time: entry.metadata.modified_at,
                create_time: entry.metadata.created_at,
                size: entry.metadata.size,
            });
        }
        entries.sort_by(index_sort::compare);
        let snapshot = WorkspaceDirectorySnapshot {
            path: path.clone(),
            entries,
        };
        let mut cache = self.cache.write().await;
        if generation != self.generation.load(Ordering::SeqCst) {
            return Err(WorkspaceError::IndexChanged);
        }
        cache.insert(path.clone(), snapshot.clone());
        Ok(snapshot)
    }
    pub async fn invalidate(&self) {
        let mut cache = self.cache.write().await;
        self.generation.fetch_add(1, Ordering::SeqCst);
        cache.clear();
    }
    pub async fn invalidate_paths(&self, paths: &[WorkspaceRelativePath]) {
        if paths
            .iter()
            .any(|p| p.file_name().is_some_and(|n| n.as_str() == ".gitignore"))
        {
            self.invalidate().await;
            return;
        }
        let mut cache = self.cache.write().await;
        self.generation.fetch_add(1, Ordering::SeqCst);
        cache.retain(|key, _| {
            !paths
                .iter()
                .any(|p| key.starts_with(p) || p.starts_with(key))
        });
    }
}

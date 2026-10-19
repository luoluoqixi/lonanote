use async_trait::async_trait;
use lonanote_core::workspace::*;
use std::sync::{Arc, Mutex};
use tokio::sync::Notify;

pub struct RecordingStorage {
    pub inner: Arc<dyn WorkspaceStorage>,
    pub lists: Mutex<Vec<String>>,
    pub reads: Mutex<Vec<String>>,
    pub fail: Mutex<Option<String>>,
    pub pause: Mutex<bool>,
    pub omit_metadata: bool,
    pub fail_reads: Mutex<Option<String>>,
    pub entered: Notify,
    pub release: Notify,
}
impl RecordingStorage {
    pub fn new(inner: Arc<dyn WorkspaceStorage>) -> Self {
        Self {
            inner,
            lists: Mutex::new(vec![]),
            reads: Mutex::new(vec![]),
            fail: Mutex::new(None),
            pause: Mutex::new(false),
            omit_metadata: false,
            fail_reads: Mutex::new(None),
            entered: Notify::new(),
            release: Notify::new(),
        }
    }
    pub fn list_paths(&self) -> Vec<String> {
        self.lists.lock().unwrap().clone()
    }
}
#[async_trait]
impl WorkspaceStorage for RecordingStorage {
    async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
        self.inner.capabilities().await
    }
    async fn exists(&self, p: &WorkspaceRelativePath) -> Result<bool, StorageError> {
        self.inner.exists(p).await
    }
    async fn metadata(
        &self,
        p: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError> {
        self.inner.metadata(p).await
    }
    async fn list_dir(&self, p: &WorkspaceRelativePath) -> Result<Vec<StorageEntry>, StorageError> {
        self.lists.lock().unwrap().push(p.to_string());
        if self.fail.lock().unwrap().as_deref() == Some(p.as_str()) {
            return Err(StorageError::Offline);
        }
        let mut entries = self.inner.list_dir(p).await?;
        if self.omit_metadata {
            for entry in &mut entries {
                entry.metadata.size = None;
                entry.metadata.modified_at = None;
                entry.metadata.created_at = None;
            }
        }
        let paused = std::mem::take(&mut *self.pause.lock().unwrap());
        if paused {
            self.entered.notify_one();
            self.release.notified().await;
        }
        Ok(entries)
    }
    async fn read(&self, p: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError> {
        self.reads.lock().unwrap().push(p.to_string());
        if self.fail_reads.lock().unwrap().as_deref() == Some(p.as_str()) {
            return Err(StorageError::Offline);
        }
        self.inner.read(p).await
    }
    async fn write(
        &self,
        p: &WorkspaceRelativePath,
        d: &[u8],
        o: WriteOptions,
    ) -> Result<(), StorageError> {
        self.inner.write(p, d, o).await
    }
    async fn create_dir_all(&self, p: &WorkspaceRelativePath) -> Result<(), StorageError> {
        self.inner.create_dir_all(p).await
    }
    async fn rename(
        &self,
        f: &WorkspaceRelativePath,
        t: &WorkspaceRelativePath,
    ) -> Result<(), StorageError> {
        self.inner.rename(f, t).await
    }
    async fn remove(&self, p: &WorkspaceRelativePath, r: bool) -> Result<(), StorageError> {
        self.inner.remove(p, r).await
    }
}

use std::sync::atomic::{AtomicUsize, Ordering};

use async_trait::async_trait;
use lonanote_core::workspace::{
    MemoryStorage, StorageCapabilities, StorageEntry, StorageEntryMetadata, StorageError,
    WorkspaceRelativePath, WorkspaceStorage, WriteOptions,
};
use tokio::sync::Notify;

/// 可以把第一次写入停在 Storage 边界上的测试替身。
#[derive(Debug)]
pub struct ControlledStorage {
    inner: MemoryStorage,
    entered: AtomicUsize,
    pause_first: bool,
    started: Notify,
    release: Notify,
}

impl ControlledStorage {
    pub fn paused() -> Self {
        Self {
            inner: MemoryStorage::new(),
            entered: AtomicUsize::new(0),
            pause_first: true,
            started: Notify::new(),
            release: Notify::new(),
        }
    }

    pub fn active() -> Self {
        Self {
            pause_first: false,
            ..Self::paused()
        }
    }

    pub fn entered(&self) -> usize {
        self.entered.load(Ordering::SeqCst)
    }

    pub async fn wait_until_first_write_enters(&self) {
        self.started.notified().await;
    }

    pub fn release_first_write(&self) {
        self.release.notify_waiters();
    }
}

#[async_trait]
impl WorkspaceStorage for ControlledStorage {
    async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
        self.inner.capabilities().await
    }

    async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError> {
        self.inner.exists(path).await
    }

    async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError> {
        self.inner.metadata(path).await
    }

    async fn list_dir(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, StorageError> {
        self.inner.list_dir(path).await
    }

    async fn read(&self, path: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError> {
        self.inner.read(path).await
    }

    async fn write(
        &self,
        path: &WorkspaceRelativePath,
        data: &[u8],
        options: WriteOptions,
    ) -> Result<(), StorageError> {
        let entered_before = self.entered.fetch_add(1, Ordering::SeqCst);
        if self.pause_first && entered_before == 0 {
            self.started.notify_one();
            self.release.notified().await;
        }
        self.inner.write(path, data, options).await
    }

    async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError> {
        self.inner.create_dir_all(path).await
    }

    async fn rename(
        &self,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), StorageError> {
        self.inner.rename(from, to).await
    }

    async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), StorageError> {
        self.inner.remove(path, recursive).await
    }
}

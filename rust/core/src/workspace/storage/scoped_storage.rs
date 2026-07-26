use std::sync::Arc;

use async_trait::async_trait;

use super::{
    StorageCapabilities, StorageEntry, StorageEntryMetadata, StorageError, WorkspaceStorage,
    WriteOptions,
};
use crate::workspace::workspace_relative_path::WorkspaceRelativePath;

/// 把 mount backend 限定到一个 Workspace 根目录，并对上层隐藏 mount 内部前缀。
pub struct ScopedStorage {
    storage: Arc<dyn WorkspaceStorage>,
    base: WorkspaceRelativePath,
}

impl ScopedStorage {
    pub fn new(storage: Arc<dyn WorkspaceStorage>, base: WorkspaceRelativePath) -> Self {
        Self { storage, base }
    }

    fn resolve(&self, path: &WorkspaceRelativePath) -> WorkspaceRelativePath {
        self.base.join(path)
    }

    fn to_scoped_entry(&self, mut entry: StorageEntry) -> Result<StorageEntry, StorageError> {
        entry.path =
            entry
                .path
                .strip_prefix(&self.base)
                .ok_or_else(|| StorageError::OutsideMount {
                    path: entry.path.clone(),
                })?;
        Ok(entry)
    }
}

impl std::fmt::Debug for ScopedStorage {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("ScopedStorage")
            .field("base", &self.base)
            .finish_non_exhaustive()
    }
}

#[async_trait]
impl WorkspaceStorage for ScopedStorage {
    async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
        self.storage.capabilities().await
    }

    async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError> {
        self.storage.exists(&self.resolve(path)).await
    }

    async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError> {
        self.storage.metadata(&self.resolve(path)).await
    }

    async fn list_dir(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, StorageError> {
        let entries = self.storage.list_dir(&self.resolve(path)).await?;
        entries
            .into_iter()
            .map(|entry| self.to_scoped_entry(entry))
            .collect()
    }

    async fn read(&self, path: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError> {
        self.storage.read(&self.resolve(path)).await
    }

    async fn write(
        &self,
        path: &WorkspaceRelativePath,
        data: &[u8],
        options: WriteOptions,
    ) -> Result<(), StorageError> {
        self.storage.write(&self.resolve(path), data, options).await
    }

    async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError> {
        self.storage.create_dir_all(&self.resolve(path)).await
    }

    async fn rename(
        &self,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), StorageError> {
        self.storage
            .rename(&self.resolve(from), &self.resolve(to))
            .await
    }

    async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), StorageError> {
        self.storage.remove(&self.resolve(path), recursive).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::workspace::{
        storage::{MemoryStorage, WriteOptions},
        workspace_relative_path::WorkspaceRelativePath,
    };

    #[tokio::test]
    async fn scoped_storage_hides_mount_prefix() {
        let mount = Arc::new(MemoryStorage::new());
        mount
            .write(
                &WorkspaceRelativePath::parse("workspaces/alpha/README.md").unwrap(),
                b"alpha",
                WriteOptions::default(),
            )
            .await
            .unwrap();
        let scoped = ScopedStorage::new(
            mount,
            WorkspaceRelativePath::parse("workspaces/alpha").unwrap(),
        );

        assert_eq!(
            scoped
                .read(&WorkspaceRelativePath::parse("README.md").unwrap())
                .await
                .unwrap(),
            b"alpha"
        );
        let entries = scoped
            .list_dir(&WorkspaceRelativePath::root())
            .await
            .unwrap();
        assert_eq!(entries[0].path.as_str(), "README.md");
    }
}

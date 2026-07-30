mod local;
mod memory;

use std::{fmt, path::Path, sync::Arc};

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::{
    domain::{
        StorageProviderId, WorkspaceDirectoryName, WorkspaceManifest, WorkspaceRelativePath,
        WorkspaceStorageBinding, WORKSPACE_MANIFEST_PATH,
    },
    error::{StorageError, WorkspaceError},
};

pub use local::{LocalFsResolver, LocalPathStorage};
pub use memory::MemoryStorage;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum StorageEntryKind {
    File,
    Directory,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageEntryMetadata {
    pub kind: StorageEntryKind,
    pub size: Option<u64>,
    pub created_at: Option<u64>,
    pub modified_at: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageEntry {
    pub path: WorkspaceRelativePath,
    pub metadata: StorageEntryMetadata,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageCapabilities {
    pub can_read: bool,
    pub can_write: bool,
    pub can_create_directory: bool,
    pub can_delete: bool,
    pub can_rename: bool,
    pub can_atomic_replace: bool,
    pub can_watch: bool,
    pub has_native_path: bool,
}

impl StorageCapabilities {
    pub const fn local_file_system() -> Self {
        Self {
            can_read: true,
            can_write: true,
            can_create_directory: true,
            can_delete: true,
            can_rename: true,
            can_atomic_replace: !cfg!(windows),
            can_watch: false,
            has_native_path: true,
        }
    }

    pub const fn memory() -> Self {
        Self {
            has_native_path: false,
            ..Self::local_file_system()
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteOptions {
    pub overwrite: bool,
    pub create_parent: bool,
    pub atomic: bool,
}

impl Default for WriteOptions {
    fn default() -> Self {
        Self {
            overwrite: true,
            create_parent: true,
            atomic: false,
        }
    }
}

impl WriteOptions {
    pub const fn atomic_replace() -> Self {
        Self {
            overwrite: true,
            create_parent: true,
            atomic: true,
        }
    }
}

#[async_trait]
pub trait WorkspaceStorage: Send + Sync {
    async fn capabilities(&self) -> Result<StorageCapabilities, StorageError>;
    async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError>;
    async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError>;
    async fn list_dir(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, StorageError>;
    async fn read(&self, path: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError>;
    async fn write(
        &self,
        path: &WorkspaceRelativePath,
        data: &[u8],
        options: WriteOptions,
    ) -> Result<(), StorageError>;
    async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError>;
    async fn rename(
        &self,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), StorageError>;
    async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), StorageError>;

    fn native_root_path(&self) -> Option<&Path> {
        None
    }
}

/// 平台授权资源在 Session 生命周期内需要保持存活时实现此 lease。
pub trait StorageAccessLease: Send + Sync {}

pub struct WorkspaceStorageSession {
    storage: Arc<dyn WorkspaceStorage>,
    _access_lease: Option<Box<dyn StorageAccessLease>>,
}

impl WorkspaceStorageSession {
    pub fn new(storage: Arc<dyn WorkspaceStorage>) -> Self {
        Self {
            storage,
            _access_lease: None,
        }
    }

    pub fn with_access_lease(
        storage: Arc<dyn WorkspaceStorage>,
        access_lease: Box<dyn StorageAccessLease>,
    ) -> Self {
        Self {
            storage,
            _access_lease: Some(access_lease),
        }
    }

    pub async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
        self.storage.capabilities().await
    }

    pub async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError> {
        self.storage.exists(path).await
    }

    pub async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError> {
        self.storage.metadata(path).await
    }

    pub async fn list_dir(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, StorageError> {
        self.storage.list_dir(path).await
    }

    pub async fn read(&self, path: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError> {
        self.storage.read(path).await
    }

    pub async fn write(
        &self,
        path: &WorkspaceRelativePath,
        data: &[u8],
        options: WriteOptions,
    ) -> Result<(), StorageError> {
        self.storage.write(path, data, options).await
    }

    pub async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError> {
        self.storage.create_dir_all(path).await
    }

    pub async fn rename(
        &self,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), StorageError> {
        self.storage.rename(from, to).await
    }

    pub async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), StorageError> {
        self.storage.remove(path, recursive).await
    }

    pub fn native_root_path(&self) -> Option<&Path> {
        self.storage.native_root_path()
    }
}

impl fmt::Debug for WorkspaceStorageSession {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("WorkspaceStorageSession")
            .field("has_access_lease", &self._access_lease.is_some())
            .field("native_root_path", &self.native_root_path())
            .finish()
    }
}

#[async_trait]
pub trait WorkspaceStorageResolver: Send + Sync {
    async fn open(
        &self,
        binding: &WorkspaceStorageBinding,
    ) -> Result<Arc<WorkspaceStorageSession>, StorageError>;

    async fn create_managed(
        &self,
        provider_id: &StorageProviderId,
        directory_name: &WorkspaceDirectoryName,
    ) -> Result<(WorkspaceStorageBinding, Arc<WorkspaceStorageSession>), StorageError>;

    /// 删除整个 Workspace 根目录。Manager 仅在显式 delete_files 请求中调用。
    async fn remove_workspace_root(
        &self,
        binding: &WorkspaceStorageBinding,
    ) -> Result<(), StorageError>;
}

pub async fn load_manifest(
    session: &WorkspaceStorageSession,
) -> Result<Option<WorkspaceManifest>, WorkspaceError> {
    let path = WorkspaceRelativePath::parse(WORKSPACE_MANIFEST_PATH)?;
    if !session.exists(&path).await? {
        return Ok(None);
    }
    let bytes = session.read(&path).await?;
    let manifest = serde_json::from_slice::<WorkspaceManifest>(&bytes)?;
    validate_manifest(&manifest)?;
    Ok(Some(manifest))
}

pub async fn save_manifest(
    session: &WorkspaceStorageSession,
    manifest: &WorkspaceManifest,
) -> Result<(), WorkspaceError> {
    validate_manifest(manifest)?;
    let path = WorkspaceRelativePath::parse(WORKSPACE_MANIFEST_PATH)?;
    let data = serde_json::to_vec_pretty(manifest)?;
    session
        .write(&path, &data, WriteOptions::atomic_replace())
        .await?;
    Ok(())
}

fn validate_manifest(manifest: &WorkspaceManifest) -> Result<(), WorkspaceError> {
    match manifest.validate() {
        Ok(()) => Ok(()),
        Err(super::error::WorkspaceManifestError::UnsupportedSchema(schema)) => {
            Err(WorkspaceError::UnsupportedManifestSchema(schema))
        }
        Err(error) => Err(error.into()),
    }
}

pub async fn copy_workspace_tree(
    source: &WorkspaceStorageSession,
    target: &WorkspaceStorageSession,
) -> Result<(), StorageError> {
    let root = WorkspaceRelativePath::root();
    let mut directories = vec![root];
    while let Some(directory) = directories.pop() {
        let entries = source.list_dir(&directory).await?;
        for entry in entries {
            match entry.metadata.kind {
                StorageEntryKind::Directory => {
                    target.create_dir_all(&entry.path).await?;
                    directories.push(entry.path);
                }
                StorageEntryKind::File => {
                    let data = source.read(&entry.path).await?;
                    target
                        .write(
                            &entry.path,
                            &data,
                            WriteOptions {
                                overwrite: false,
                                create_parent: true,
                                atomic: false,
                            },
                        )
                        .await?;
                }
            }
        }
    }
    Ok(())
}

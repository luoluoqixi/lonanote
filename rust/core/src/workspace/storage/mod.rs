mod local_path_storage;
mod memory_storage;
mod operations;
mod scoped_storage;

use std::{fmt, sync::Arc};

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use super::storage_mount::StorageAvailability;
use super::storage_mount::StorageMountRecord;
use super::workspace_relative_path::{WorkspacePathError, WorkspaceRelativePath};

pub use local_path_storage::{LocalPathStorage, LocalPathStorageFactory};
pub use memory_storage::{MemoryStorage, MemoryStorageFactory};
pub use operations::move_entry;
pub use scoped_storage::ScopedStorage;

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
    pub created_time: Option<u64>,
    pub modified_time: Option<u64>,
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
    pub can_move: bool,
    pub can_atomic_replace: bool,
    pub can_watch: bool,
    pub has_creation_time: bool,
    pub has_modified_time: bool,
    /// provider 是否能解析为当前进程可直接使用的原生路径。
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
            can_move: true,
            can_atomic_replace: false,
            can_watch: false,
            has_creation_time: cfg!(any(
                target_os = "windows",
                target_os = "macos",
                target_os = "ios"
            )),
            has_modified_time: true,
            has_native_path: true,
        }
    }

    pub const fn memory() -> Self {
        Self {
            has_creation_time: true,
            has_native_path: false,
            ..Self::local_file_system()
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteOptions {
    /// 目标存在时是否覆盖。
    pub overwrite: bool,
    /// 父目录不存在时是否创建。
    pub create_parent: bool,
}

impl Default for WriteOptions {
    fn default() -> Self {
        Self {
            overwrite: true,
            create_parent: true,
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
}

#[async_trait]
pub trait WorkspaceStorageFactory: Send + Sync {
    async fn open_mount(&self, mount: &StorageMountRecord) -> Result<MountedStorage, StorageError>;
}

/// 原生授权资源在挂载期间需要保持存活时，由平台实现这个 lease。
pub trait StorageAccessLease: Send + Sync {}

pub struct MountedStorage {
    storage: Arc<dyn WorkspaceStorage>,
    _access_lease: Option<Box<dyn StorageAccessLease>>,
}

impl MountedStorage {
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

    pub fn storage(&self) -> Arc<dyn WorkspaceStorage> {
        Arc::clone(&self.storage)
    }

    pub fn into_scoped(mut self, base: WorkspaceRelativePath) -> Self {
        self.storage = Arc::new(ScopedStorage::new(self.storage, base));
        self
    }
}

impl fmt::Debug for MountedStorage {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("MountedStorage")
            .field("has_access_lease", &self._access_lease.is_some())
            .finish_non_exhaustive()
    }
}

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("存储路径不存在: {path}")]
    NotFound { path: WorkspaceRelativePath },
    #[error("存储路径已存在: {path}")]
    AlreadyExists { path: WorkspaceRelativePath },
    #[error("存储路径不是目录: {path}")]
    NotDirectory { path: WorkspaceRelativePath },
    #[error("存储路径是目录，不能作为文件读取: {path}")]
    IsDirectory { path: WorkspaceRelativePath },
    #[error("目录非空: {path}")]
    DirectoryNotEmpty { path: WorkspaceRelativePath },
    #[error("不能修改 storage 根目录")]
    CannotModifyRoot,
    #[error("存储路径越过挂载点边界: {path}")]
    OutsideMount { path: WorkspaceRelativePath },
    #[error("存储后端不支持该操作: {operation}")]
    Unsupported { operation: &'static str },
    #[error("存储需要重新授权")]
    AuthorizationRequired,
    #[error("存储授权已失效")]
    AuthorizationRevoked,
    #[error("存储 Provider 当前不可用")]
    ProviderUnavailable,
    #[error("存储当前离线")]
    Offline,
    #[error("存储卷当前不可用")]
    VolumeUnavailable,
    #[error("文件尚未下载到本地: {path}")]
    NotDownloaded { path: WorkspaceRelativePath },
    #[error("存储为只读，不能执行操作: {operation}")]
    ReadOnly { operation: &'static str },
    #[error("原生存储桥调用失败（{operation}）: {message}")]
    NativeBridge {
        operation: &'static str,
        message: String,
    },
    #[error("无效 workspace 相对路径: {0}")]
    InvalidPath(#[from] WorkspacePathError),
    #[error("存储 IO 失败（{operation}）: {message}")]
    Io {
        operation: &'static str,
        message: String,
    },
}

impl StorageError {
    pub(crate) fn io(operation: &'static str, error: impl fmt::Display) -> Self {
        Self::Io {
            operation,
            message: error.to_string(),
        }
    }

    pub fn availability(&self) -> StorageAvailability {
        match self {
            Self::AuthorizationRequired => StorageAvailability::AuthorizationRequired,
            Self::AuthorizationRevoked => StorageAvailability::AuthorizationRevoked,
            Self::Offline => StorageAvailability::Offline,
            Self::ProviderUnavailable | Self::NativeBridge { .. } | Self::Io { .. } => {
                StorageAvailability::ProviderUnavailable
            }
            Self::VolumeUnavailable => StorageAvailability::VolumeUnavailable,
            Self::NotDownloaded { .. } => StorageAvailability::NotDownloaded,
            Self::NotFound { .. } => StorageAvailability::NotFound,
            Self::Unsupported { .. } => StorageAvailability::Unsupported,
            Self::ReadOnly { .. }
            | Self::AlreadyExists { .. }
            | Self::NotDirectory { .. }
            | Self::IsDirectory { .. }
            | Self::DirectoryNotEmpty { .. }
            | Self::CannotModifyRoot
            | Self::OutsideMount { .. }
            | Self::InvalidPath(_) => StorageAvailability::Available,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;
    use crate::workspace::workspace_relative_path::WorkspaceRelativePath;

    async fn run_storage_contract(storage: Arc<dyn WorkspaceStorage>) {
        let root = WorkspaceRelativePath::root();
        let notes = WorkspaceRelativePath::parse("notes").unwrap();
        let source = WorkspaceRelativePath::parse("notes/today.md").unwrap();
        let target = WorkspaceRelativePath::parse("notes/tomorrow.md").unwrap();
        let binary = WorkspaceRelativePath::parse("notes/附件.bin").unwrap();
        let missing = WorkspaceRelativePath::parse("missing.md").unwrap();

        let capabilities = storage.capabilities().await.unwrap();
        assert!(capabilities.can_read);
        assert!(capabilities.can_write);
        assert!(capabilities.can_delete);
        assert!(storage.exists(&root).await.unwrap());
        storage.create_dir_all(&notes).await.unwrap();
        storage
            .write(&source, b"hello", WriteOptions::default())
            .await
            .unwrap();
        assert_eq!(storage.read(&source).await.unwrap(), b"hello");
        storage
            .write(&binary, &[0, 1, 0xff, 0, 0x7f], WriteOptions::default())
            .await
            .unwrap();
        assert_eq!(storage.read(&binary).await.unwrap(), [0, 1, 0xff, 0, 0x7f]);
        assert!(matches!(
            storage.read(&missing).await,
            Err(StorageError::NotFound { .. })
        ));
        assert!(matches!(
            storage
                .write(
                    &source,
                    b"blocked",
                    WriteOptions {
                        overwrite: false,
                        create_parent: false,
                    },
                )
                .await,
            Err(StorageError::AlreadyExists { .. })
        ));

        let children = storage.list_dir(&notes).await.unwrap();
        assert_eq!(children.len(), 2);
        let text_entry = children.iter().find(|entry| entry.path == source).unwrap();
        assert_eq!(text_entry.metadata.kind, StorageEntryKind::File);
        assert_eq!(text_entry.metadata.size, Some(5));

        storage.rename(&source, &target).await.unwrap();
        assert!(!storage.exists(&source).await.unwrap());
        assert_eq!(storage.read(&target).await.unwrap(), b"hello");
        assert!(matches!(
            storage.remove(&notes, false).await,
            Err(StorageError::DirectoryNotEmpty { .. })
        ));

        storage.remove(&notes, true).await.unwrap();
        assert!(!storage.exists(&notes).await.unwrap());
    }

    #[tokio::test]
    async fn memory_storage_obeys_contract() {
        run_storage_contract(Arc::new(MemoryStorage::new())).await;
    }

    #[tokio::test]
    async fn local_storage_obeys_contract() {
        let base = std::env::temp_dir().join(format!(
            "lonanote-local-storage-test-{}",
            uuid::Uuid::new_v4()
        ));
        let storage = Arc::new(LocalPathStorage::new(&base).expect("create local storage"));

        run_storage_contract(storage).await;
        std::fs::remove_dir_all(base).expect("remove local storage test directory");
    }

    #[test]
    fn platform_storage_errors_map_to_stable_availability() {
        assert_eq!(
            StorageError::AuthorizationRevoked.availability(),
            StorageAvailability::AuthorizationRevoked
        );
        assert_eq!(
            StorageError::Offline.availability(),
            StorageAvailability::Offline
        );
        assert_eq!(
            StorageError::VolumeUnavailable.availability(),
            StorageAvailability::VolumeUnavailable
        );
        assert_eq!(
            StorageError::NotDownloaded {
                path: WorkspaceRelativePath::parse("cloud.md").unwrap()
            }
            .availability(),
            StorageAvailability::NotDownloaded
        );
    }
}

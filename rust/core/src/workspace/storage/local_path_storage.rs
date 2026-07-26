use std::{
    path::{Path, PathBuf},
    sync::Arc,
    time::UNIX_EPOCH,
};

use async_trait::async_trait;
use tokio::{
    fs,
    io::{AsyncReadExt, AsyncWriteExt},
};

use super::{
    MountedStorage, StorageCapabilities, StorageEntry, StorageEntryKind, StorageEntryMetadata,
    StorageError, WorkspaceStorage, WorkspaceStorageFactory, WriteOptions,
};
use crate::workspace::{
    storage_mount::{StorageMountKind, StorageMountRecord},
    workspace_relative_path::{WorkspaceEntryName, WorkspaceRelativePath},
};

#[derive(Debug, Clone)]
pub struct LocalPathStorage {
    base_path: PathBuf,
}

#[derive(Debug, Default, Clone)]
pub struct LocalPathStorageFactory {
    desktop_documents: Option<PathBuf>,
    ios_app_documents: Option<PathBuf>,
    android_app_internal: Option<PathBuf>,
}

impl LocalPathStorageFactory {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_desktop_documents(mut self, path: impl Into<PathBuf>) -> Self {
        self.desktop_documents = Some(path.into());
        self
    }

    pub fn with_ios_app_documents(mut self, path: impl Into<PathBuf>) -> Self {
        self.ios_app_documents = Some(path.into());
        self
    }

    pub fn with_android_app_internal(mut self, path: impl Into<PathBuf>) -> Self {
        self.android_app_internal = Some(path.into());
        self
    }

    fn semantic_root(&self, mount: &StorageMountKind) -> Option<&Path> {
        match mount {
            StorageMountKind::DesktopDocuments => self.desktop_documents.as_deref(),
            StorageMountKind::IosAppDocuments => self.ios_app_documents.as_deref(),
            StorageMountKind::AndroidAppInternal => self.android_app_internal.as_deref(),
            _ => None,
        }
    }
}

#[async_trait]
impl WorkspaceStorageFactory for LocalPathStorageFactory {
    async fn open_mount(&self, mount: &StorageMountRecord) -> Result<MountedStorage, StorageError> {
        match &mount.kind {
            StorageMountKind::DesktopAbsolute { base_path } => Ok(MountedStorage::new(Arc::new(
                LocalPathStorage::open_existing(base_path)?,
            ))),
            kind => match self.semantic_root(kind) {
                Some(path) => Ok(MountedStorage::new(Arc::new(
                    LocalPathStorage::open_existing(path)?,
                ))),
                None => Err(StorageError::Unsupported {
                    operation: "open unresolved mount with LocalPathStorageFactory",
                }),
            },
        }
    }
}

impl LocalPathStorage {
    pub fn new(base_path: impl AsRef<Path>) -> Result<Self, StorageError> {
        std::fs::create_dir_all(base_path.as_ref())
            .map_err(|error| StorageError::io("create mount directory", error))?;
        let base_path = std::fs::canonicalize(base_path.as_ref())
            .map_err(|error| StorageError::io("canonicalize mount directory", error))?;

        Ok(Self { base_path })
    }

    pub fn open_existing(base_path: impl AsRef<Path>) -> Result<Self, StorageError> {
        let metadata = std::fs::metadata(base_path.as_ref()).map_err(|error| {
            map_io_error(
                "open mount directory",
                &WorkspaceRelativePath::root(),
                error,
            )
        })?;
        if !metadata.is_dir() {
            return Err(StorageError::NotDirectory {
                path: WorkspaceRelativePath::root(),
            });
        }
        let base_path = std::fs::canonicalize(base_path.as_ref())
            .map_err(|error| StorageError::io("canonicalize mount directory", error))?;
        Ok(Self { base_path })
    }

    pub fn base_path(&self) -> &Path {
        &self.base_path
    }

    fn resolve_lexical(&self, path: &WorkspaceRelativePath) -> PathBuf {
        let mut resolved = self.base_path.clone();
        for component in path.components() {
            resolved.push(component);
        }
        resolved
    }

    /// 校验已存在路径或最近已存在父目录没有通过 symlink 越过 mount。
    async fn resolve_checked(&self, path: &WorkspaceRelativePath) -> Result<PathBuf, StorageError> {
        let resolved = self.resolve_lexical(path);
        let mut existing = resolved.as_path();
        loop {
            match fs::symlink_metadata(existing).await {
                Ok(_) => break,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    existing = existing
                        .parent()
                        .ok_or_else(|| StorageError::OutsideMount { path: path.clone() })?;
                }
                Err(error) => return Err(map_io_error("inspect storage path", path, error)),
            }
        }

        let canonical = fs::canonicalize(existing)
            .await
            .map_err(|error| StorageError::io("canonicalize storage path", error))?;
        if !canonical.starts_with(&self.base_path) {
            return Err(StorageError::OutsideMount { path: path.clone() });
        }

        Ok(resolved)
    }

    async fn metadata_for_path(
        &self,
        path: &WorkspaceRelativePath,
        native_path: &Path,
    ) -> Result<StorageEntryMetadata, StorageError> {
        let symlink_metadata = fs::symlink_metadata(native_path)
            .await
            .map_err(|error| map_io_error("symlink metadata", path, error))?;
        if symlink_metadata.file_type().is_symlink() {
            return Err(StorageError::Unsupported {
                operation: "follow symbolic link",
            });
        }
        let metadata = fs::metadata(native_path)
            .await
            .map_err(|error| map_io_error("metadata", path, error))?;
        let kind = if metadata.is_dir() {
            StorageEntryKind::Directory
        } else if metadata.is_file() {
            StorageEntryKind::File
        } else {
            return Err(StorageError::Unsupported {
                operation: "read special filesystem entry",
            });
        };

        Ok(StorageEntryMetadata {
            kind,
            size: (kind == StorageEntryKind::File).then_some(metadata.len()),
            created_time: system_time_seconds(metadata.created().ok()),
            modified_time: system_time_seconds(metadata.modified().ok()),
        })
    }
}

#[async_trait]
impl WorkspaceStorage for LocalPathStorage {
    async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
        Ok(StorageCapabilities::local_file_system())
    }

    async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError> {
        let native_path = self.resolve_checked(path).await?;
        match fs::metadata(native_path).await {
            Ok(_) => Ok(true),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(error) => Err(map_io_error("check storage path", path, error)),
        }
    }

    async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError> {
        let native_path = self.resolve_checked(path).await?;
        self.metadata_for_path(path, &native_path).await
    }

    async fn list_dir(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, StorageError> {
        let native_path = self.resolve_checked(path).await?;
        let metadata = self.metadata_for_path(path, &native_path).await?;
        if metadata.kind != StorageEntryKind::Directory {
            return Err(StorageError::NotDirectory { path: path.clone() });
        }

        let mut reader = fs::read_dir(native_path)
            .await
            .map_err(|error| map_io_error("list directory", path, error))?;
        let mut entries = Vec::new();
        while let Some(entry) = reader
            .next_entry()
            .await
            .map_err(|error| map_io_error("read directory entry", path, error))?
        {
            let name = entry
                .file_name()
                .into_string()
                .map_err(|_| StorageError::Unsupported {
                    operation: "read non-UTF-8 entry name",
                })?;
            let name = WorkspaceEntryName::parse(name)?;
            let entry_path = path.join_name(&name);
            let checked_path = self.resolve_checked(&entry_path).await?;
            entries.push(StorageEntry {
                metadata: self.metadata_for_path(&entry_path, &checked_path).await?,
                path: entry_path,
            });
        }
        entries.sort_by(|left, right| left.path.cmp(&right.path));

        Ok(entries)
    }

    async fn read(&self, path: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError> {
        let native_path = self.resolve_checked(path).await?;
        if self.metadata_for_path(path, &native_path).await?.kind == StorageEntryKind::Directory {
            return Err(StorageError::IsDirectory { path: path.clone() });
        }

        let mut file = fs::File::open(native_path)
            .await
            .map_err(|error| map_io_error("open file", path, error))?;
        let mut data = Vec::new();
        file.read_to_end(&mut data)
            .await
            .map_err(|error| map_io_error("read file", path, error))?;
        Ok(data)
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

        let native_path = self.resolve_checked(path).await?;
        if options.create_parent {
            let parent = native_path
                .parent()
                .ok_or_else(|| StorageError::OutsideMount { path: path.clone() })?;
            fs::create_dir_all(parent)
                .await
                .map_err(|error| map_io_error("create parent directory", path, error))?;
        }

        let mut open_options = fs::OpenOptions::new();
        open_options.write(true);
        if options.overwrite {
            open_options.create(true).truncate(true);
        } else {
            open_options.create_new(true);
        }
        let mut file = open_options
            .open(native_path)
            .await
            .map_err(|error| map_io_error("open file for write", path, error))?;
        file.write_all(data)
            .await
            .map_err(|error| map_io_error("write file", path, error))?;
        file.flush()
            .await
            .map_err(|error| map_io_error("flush file", path, error))?;

        Ok(())
    }

    async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError> {
        let native_path = self.resolve_checked(path).await?;
        fs::create_dir_all(native_path)
            .await
            .map_err(|error| map_io_error("create directory", path, error))
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

        let from_path = self.resolve_checked(from).await?;
        let to_path = self.resolve_checked(to).await?;
        if fs::metadata(&to_path).await.is_ok() {
            return Err(StorageError::AlreadyExists { path: to.clone() });
        }
        let parent = to_path
            .parent()
            .ok_or_else(|| StorageError::OutsideMount { path: to.clone() })?;
        if !fs::metadata(parent)
            .await
            .map(|value| value.is_dir())
            .unwrap_or(false)
        {
            return Err(StorageError::NotFound {
                path: to.parent().unwrap_or_else(WorkspaceRelativePath::root),
            });
        }

        fs::rename(from_path, to_path)
            .await
            .map_err(|error| map_io_error("rename", from, error))
    }

    async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), StorageError> {
        if path.is_root() {
            return Err(StorageError::CannotModifyRoot);
        }

        let native_path = self.resolve_checked(path).await?;
        let metadata = self.metadata_for_path(path, &native_path).await?;
        match metadata.kind {
            StorageEntryKind::File => fs::remove_file(native_path)
                .await
                .map_err(|error| map_io_error("remove file", path, error)),
            StorageEntryKind::Directory if recursive => fs::remove_dir_all(native_path)
                .await
                .map_err(|error| map_io_error("remove directory recursively", path, error)),
            StorageEntryKind::Directory => fs::remove_dir(native_path)
                .await
                .map_err(|error| map_io_error("remove directory", path, error)),
        }
    }
}

fn map_io_error(
    operation: &'static str,
    path: &WorkspaceRelativePath,
    error: std::io::Error,
) -> StorageError {
    match error.kind() {
        std::io::ErrorKind::NotFound => StorageError::NotFound { path: path.clone() },
        std::io::ErrorKind::AlreadyExists => StorageError::AlreadyExists { path: path.clone() },
        std::io::ErrorKind::DirectoryNotEmpty => {
            StorageError::DirectoryNotEmpty { path: path.clone() }
        }
        _ => StorageError::io(operation, error),
    }
}

fn system_time_seconds(value: Option<std::time::SystemTime>) -> Option<u64> {
    value
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs())
}

#[cfg(unix)]
#[cfg(test)]
mod tests {
    use std::os::unix::fs::symlink;

    use super::*;

    #[tokio::test]
    async fn rejects_symlink_escape() {
        let root = std::env::temp_dir().join(format!(
            "lonanote-local-storage-root-{}",
            uuid::Uuid::new_v4()
        ));
        let outside = std::env::temp_dir().join(format!(
            "lonanote-local-storage-outside-{}",
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(&outside).unwrap();
        let storage = LocalPathStorage::new(&root).unwrap();
        symlink(&outside, root.join("escape")).unwrap();
        std::fs::create_dir_all(root.join("real")).unwrap();
        symlink(root.join("real"), root.join("alias")).unwrap();

        let result = storage
            .read(&WorkspaceRelativePath::parse("escape/secret.md").unwrap())
            .await;
        assert!(matches!(result, Err(StorageError::OutsideMount { .. })));
        assert!(matches!(
            storage
                .metadata(&WorkspaceRelativePath::parse("alias").unwrap())
                .await,
            Err(StorageError::Unsupported {
                operation: "follow symbolic link"
            })
        ));

        std::fs::remove_dir_all(root).unwrap();
        std::fs::remove_dir_all(outside).unwrap();
    }

    #[test]
    fn opening_a_missing_mount_does_not_create_it() {
        let root = std::env::temp_dir().join(format!(
            "lonanote-missing-local-mount-{}",
            uuid::Uuid::new_v4()
        ));
        assert!(matches!(
            LocalPathStorage::open_existing(&root),
            Err(StorageError::NotFound { .. })
        ));
        assert!(!root.exists());
    }
}

use std::{
    collections::{HashMap, HashSet},
    io::ErrorKind,
    path::{Path, PathBuf},
    sync::Arc,
    time::UNIX_EPOCH,
};

use async_trait::async_trait;
use sha2::{Digest, Sha256};
use tokio::io::AsyncWriteExt;

use super::{
    StorageCapabilities, StorageEntry, StorageEntryKind, StorageEntryMetadata, StorageError,
    WorkspaceStorage, WorkspaceStorageResolver, WorkspaceStorageSession, WriteOptions,
};
use crate::workspace::domain::{
    StorageProviderId, StorageResourceIdentity, WorkspaceDirectoryName, WorkspaceRelativePath,
    WorkspaceStorageBinding, WorkspaceStorageBindingRequest, WorkspaceStorageLocation,
};

const LOCAL_FS_PROVIDER_SCHEMA_VERSION: u32 = 1;

#[derive(Debug)]
pub struct LocalPathStorage {
    root: PathBuf,
}

impl LocalPathStorage {
    pub fn open(root: impl AsRef<Path>) -> Result<Self, StorageError> {
        let root_input = root.as_ref();
        let input_metadata = std::fs::symlink_metadata(root_input)
            .map_err(|error| map_root_io("metadata_root", error))?;
        if input_metadata.file_type().is_symlink() || !input_metadata.is_dir() {
            return Err(StorageError::NotDirectory {
                path: WorkspaceRelativePath::root(),
            });
        }
        let root =
            std::fs::canonicalize(root_input).map_err(|error| map_root_io("open_root", error))?;
        let metadata = std::fs::symlink_metadata(&root)
            .map_err(|error| map_root_io("metadata_root", error))?;
        if metadata.file_type().is_symlink() || !metadata.is_dir() {
            return Err(StorageError::NotDirectory {
                path: WorkspaceRelativePath::root(),
            });
        }
        Ok(Self { root })
    }

    pub fn create(root: impl AsRef<Path>) -> Result<Self, StorageError> {
        std::fs::create_dir_all(root.as_ref())
            .map_err(|error| map_root_io("create_root", error))?;
        Self::open(root)
    }

    pub fn root_path(&self) -> &Path {
        &self.root
    }

    fn checked_existing(&self, path: &WorkspaceRelativePath) -> Result<PathBuf, StorageError> {
        let mut current = self.root.clone();
        for component in path.components() {
            current.push(component);
            let metadata = std::fs::symlink_metadata(&current)
                .map_err(|error| map_path_io(path, "resolve", error))?;
            if metadata.file_type().is_symlink() {
                return Err(StorageError::OutsideWorkspace { path: path.clone() });
            }
        }
        Ok(current)
    }

    fn checked_for_creation(&self, path: &WorkspaceRelativePath) -> Result<PathBuf, StorageError> {
        let mut current = self.root.clone();
        let mut encountered_missing = false;
        for component in path.components() {
            current.push(component);
            if encountered_missing {
                continue;
            }
            match std::fs::symlink_metadata(&current) {
                Ok(metadata) => {
                    if metadata.file_type().is_symlink() {
                        return Err(StorageError::OutsideWorkspace { path: path.clone() });
                    }
                }
                Err(error) if error.kind() == ErrorKind::NotFound => {
                    encountered_missing = true;
                }
                Err(error) => return Err(map_path_io(path, "resolve_for_creation", error)),
            }
        }
        Ok(current)
    }

    fn ensure_directory(&self, path: &WorkspaceRelativePath) -> Result<PathBuf, StorageError> {
        let native = self.checked_existing(path)?;
        let metadata =
            std::fs::metadata(&native).map_err(|error| map_path_io(path, "metadata", error))?;
        if !metadata.is_dir() {
            return Err(StorageError::NotDirectory { path: path.clone() });
        }
        Ok(native)
    }

    fn ensure_parent(
        &self,
        path: &WorkspaceRelativePath,
        create_parent: bool,
    ) -> Result<(), StorageError> {
        let parent = path.parent().ok_or(StorageError::CannotModifyRoot)?;
        match self.checked_existing(&parent) {
            Ok(native_parent) => {
                let metadata = std::fs::metadata(native_parent)
                    .map_err(|error| map_path_io(&parent, "metadata_parent", error))?;
                if !metadata.is_dir() {
                    return Err(StorageError::NotDirectory { path: parent });
                }
            }
            Err(StorageError::NotFound { .. }) if create_parent => {
                let native_parent = self.checked_for_creation(&parent)?;
                std::fs::create_dir_all(native_parent)
                    .map_err(|error| map_path_io(&parent, "create_parent", error))?;
            }
            Err(error) => return Err(error),
        }
        Ok(())
    }

    async fn direct_write(
        &self,
        native: &Path,
        path: &WorkspaceRelativePath,
        data: &[u8],
        overwrite: bool,
    ) -> Result<(), StorageError> {
        let mut options = tokio::fs::OpenOptions::new();
        options.write(true).create(true);
        if overwrite {
            options.truncate(true);
        } else {
            options.create_new(true);
        }
        let mut file = options
            .open(native)
            .await
            .map_err(|error| map_path_io(path, "open_write", error))?;
        file.write_all(data)
            .await
            .map_err(|error| map_path_io(path, "write", error))?;
        file.flush()
            .await
            .map_err(|error| map_path_io(path, "flush", error))?;
        Ok(())
    }

    async fn atomic_write(
        &self,
        native: &Path,
        path: &WorkspaceRelativePath,
        data: &[u8],
        overwrite: bool,
    ) -> Result<(), StorageError> {
        if native.exists() && !overwrite {
            return Err(StorageError::AlreadyExists { path: path.clone() });
        }
        let parent = native.parent().ok_or(StorageError::CannotModifyRoot)?;
        let file_name = native
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("workspace");
        let temporary = parent.join(format!(
            ".{file_name}.{}.tmp",
            uuid::Uuid::new_v4().hyphenated()
        ));

        let result = async {
            let mut file = tokio::fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&temporary)
                .await
                .map_err(|error| map_path_io(path, "create_temporary", error))?;
            file.write_all(data)
                .await
                .map_err(|error| map_path_io(path, "write_temporary", error))?;
            file.flush()
                .await
                .map_err(|error| map_path_io(path, "flush_temporary", error))?;
            file.sync_all()
                .await
                .map_err(|error| map_path_io(path, "sync_temporary", error))?;
            drop(file);

            #[cfg(windows)]
            if native.exists() {
                tokio::fs::remove_file(native)
                    .await
                    .map_err(|error| map_path_io(path, "remove_before_replace", error))?;
            }

            tokio::fs::rename(&temporary, native)
                .await
                .map_err(|error| map_path_io(path, "atomic_replace", error))?;
            Ok(())
        }
        .await;

        if result.is_err() {
            let _ = tokio::fs::remove_file(&temporary).await;
        }
        result
    }
}

#[async_trait]
impl WorkspaceStorage for LocalPathStorage {
    async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
        Ok(StorageCapabilities::local_file_system())
    }

    async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError> {
        match self.checked_existing(path) {
            Ok(_) => Ok(true),
            Err(StorageError::NotFound { .. }) => Ok(false),
            Err(error) => Err(error),
        }
    }

    async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError> {
        let native = self.checked_existing(path)?;
        let metadata = tokio::fs::metadata(native)
            .await
            .map_err(|error| map_path_io(path, "metadata", error))?;
        Ok(metadata_to_entry(&metadata))
    }

    async fn list_dir(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, StorageError> {
        let native = self.ensure_directory(path)?;
        let mut directory = tokio::fs::read_dir(native)
            .await
            .map_err(|error| map_path_io(path, "list_dir", error))?;
        let mut entries = Vec::new();
        while let Some(entry) = directory
            .next_entry()
            .await
            .map_err(|error| map_path_io(path, "list_dir_next", error))?
        {
            let name = entry.file_name().to_string_lossy().into_owned();
            let child = path.join(&WorkspaceRelativePath::parse(name).map_err(|error| {
                StorageError::Io {
                    operation: "parse_entry_name",
                    message: error.to_string(),
                }
            })?);
            let checked = self.checked_existing(&child)?;
            let metadata = tokio::fs::metadata(checked)
                .await
                .map_err(|error| map_path_io(&child, "metadata", error))?;
            entries.push(StorageEntry {
                path: child,
                metadata: metadata_to_entry(&metadata),
            });
        }
        entries.sort_by(|left, right| left.path.cmp(&right.path));
        Ok(entries)
    }

    async fn read(&self, path: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError> {
        let native = self.checked_existing(path)?;
        let metadata = tokio::fs::metadata(&native)
            .await
            .map_err(|error| map_path_io(path, "metadata_read", error))?;
        if metadata.is_dir() {
            return Err(StorageError::IsDirectory { path: path.clone() });
        }
        tokio::fs::read(native)
            .await
            .map_err(|error| map_path_io(path, "read", error))
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
        self.ensure_parent(path, options.create_parent)?;
        let native = self.checked_for_creation(path)?;
        if let Ok(metadata) = std::fs::metadata(&native) {
            if metadata.is_dir() {
                return Err(StorageError::IsDirectory { path: path.clone() });
            }
            if !options.overwrite {
                return Err(StorageError::AlreadyExists { path: path.clone() });
            }
        }
        if options.atomic {
            self.atomic_write(&native, path, data, options.overwrite)
                .await
        } else {
            self.direct_write(&native, path, data, options.overwrite)
                .await
        }
    }

    async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError> {
        if path.is_root() {
            return Ok(());
        }
        let native = self.checked_for_creation(path)?;
        if native.exists() && !native.is_dir() {
            return Err(StorageError::NotDirectory { path: path.clone() });
        }
        tokio::fs::create_dir_all(native)
            .await
            .map_err(|error| map_path_io(path, "create_dir_all", error))
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
        let source = self.checked_existing(from)?;
        self.ensure_parent(to, false)?;
        match self.checked_existing(to) {
            Ok(_) => return Err(StorageError::AlreadyExists { path: to.clone() }),
            Err(StorageError::NotFound { .. }) => {}
            Err(error) => return Err(error),
        }
        let target = self.checked_for_creation(to)?;
        tokio::fs::rename(source, target)
            .await
            .map_err(|error| map_path_io(from, "rename", error))
    }

    async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), StorageError> {
        if path.is_root() {
            return Err(StorageError::CannotModifyRoot);
        }
        let native = self.checked_existing(path)?;
        let metadata = tokio::fs::metadata(&native)
            .await
            .map_err(|error| map_path_io(path, "metadata_remove", error))?;
        if metadata.is_dir() {
            if recursive {
                tokio::fs::remove_dir_all(native)
                    .await
                    .map_err(|error| map_path_io(path, "remove_dir_all", error))
            } else {
                tokio::fs::remove_dir(native).await.map_err(|error| {
                    if error.kind() == ErrorKind::DirectoryNotEmpty {
                        StorageError::DirectoryNotEmpty { path: path.clone() }
                    } else {
                        map_path_io(path, "remove_dir", error)
                    }
                })
            }
        } else {
            tokio::fs::remove_file(native)
                .await
                .map_err(|error| map_path_io(path, "remove_file", error))
        }
    }

    fn native_root_path(&self) -> Option<&Path> {
        Some(&self.root)
    }
}

#[derive(Debug, Default)]
pub struct LocalFsResolver {
    managed_roots: HashMap<StorageProviderId, PathBuf>,
    external_providers: HashSet<StorageProviderId>,
}

impl LocalFsResolver {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_managed_provider(
        mut self,
        provider_id: StorageProviderId,
        provider_root: impl Into<PathBuf>,
    ) -> Self {
        self.managed_roots.insert(provider_id, provider_root.into());
        self
    }

    pub fn with_external_provider(mut self, provider_id: StorageProviderId) -> Self {
        self.external_providers.insert(provider_id);
        self
    }

    fn resolve_root(
        &self,
        provider_id: &StorageProviderId,
        provider_schema_version: u32,
        location: &WorkspaceStorageLocation,
    ) -> Result<PathBuf, StorageError> {
        self.ensure_supported_schema(provider_id, provider_schema_version)?;
        match location {
            WorkspaceStorageLocation::Managed { directory_name } => self
                .managed_roots
                .get(provider_id)
                .map(|root| root.join("workspaces").join(directory_name.as_str()))
                .ok_or_else(|| StorageError::UnsupportedProvider {
                    provider_id: provider_id.clone(),
                }),
            WorkspaceStorageLocation::External { resource_ref } => {
                if !self.external_providers.contains(provider_id) {
                    return Err(StorageError::UnsupportedProvider {
                        provider_id: provider_id.clone(),
                    });
                }
                let path = PathBuf::from(resource_ref.as_str());
                if !path.is_absolute() {
                    return Err(StorageError::Io {
                        operation: "resolve_external",
                        message: "External resource_ref 必须是绝对路径".to_string(),
                    });
                }
                Ok(path)
            }
        }
    }

    fn ensure_supported_schema(
        &self,
        provider_id: &StorageProviderId,
        provider_schema_version: u32,
    ) -> Result<(), StorageError> {
        if provider_schema_version != LOCAL_FS_PROVIDER_SCHEMA_VERSION {
            return Err(StorageError::UnsupportedProviderSchema {
                provider_id: provider_id.clone(),
                schema_version: provider_schema_version,
            });
        }
        Ok(())
    }

    fn identity_for_root(&self, root: &Path) -> Result<StorageResourceIdentity, StorageError> {
        let absolute = if root.is_absolute() {
            root.to_path_buf()
        } else {
            std::env::current_dir()
                .map_err(|error| map_root_io("resolve_identity_current_dir", error))?
                .join(root)
        };
        let mut normalized = PathBuf::new();
        for component in absolute.components() {
            match component {
                std::path::Component::CurDir => {}
                std::path::Component::ParentDir => {
                    normalized.pop();
                }
                _ => normalized.push(component.as_os_str()),
            }
        }
        let path_key = normalized.to_string_lossy().into_owned();
        #[cfg(windows)]
        let path_key = path_key.replace('\\', "/");
        #[cfg(any(target_os = "macos", windows))]
        let path_key = path_key.to_lowercase();
        let digest = Sha256::digest(path_key.as_bytes());
        let digest = digest
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>();
        let value = format!("local-fs:path-sha256:{digest}");

        StorageResourceIdentity::parse(value).map_err(|error| StorageError::Io {
            operation: "resolve_identity",
            message: error.to_string(),
        })
    }
}

#[async_trait]
impl WorkspaceStorageResolver for LocalFsResolver {
    fn provider_ids(&self) -> Vec<StorageProviderId> {
        let mut provider_ids = self
            .managed_roots
            .keys()
            .chain(self.external_providers.iter())
            .cloned()
            .collect::<Vec<_>>();
        provider_ids.sort();
        provider_ids.dedup();
        provider_ids
    }

    fn managed_provider_ids(&self) -> Vec<StorageProviderId> {
        let mut provider_ids = self.managed_roots.keys().cloned().collect::<Vec<_>>();
        provider_ids.sort();
        provider_ids.dedup();
        provider_ids
    }

    async fn resolve_identity(
        &self,
        request: &WorkspaceStorageBindingRequest,
    ) -> Result<StorageResourceIdentity, StorageError> {
        let root = self.resolve_root(
            &request.provider_id,
            request.provider_schema_version,
            &request.location,
        )?;
        self.identity_for_root(&root)
    }

    async fn open(
        &self,
        binding: &WorkspaceStorageBinding,
    ) -> Result<Arc<WorkspaceStorageSession>, StorageError> {
        let root = self.resolve_root(
            &binding.provider_id,
            binding.provider_schema_version,
            &binding.location,
        )?;
        let storage = LocalPathStorage::open(root)?;
        Ok(Arc::new(WorkspaceStorageSession::new(Arc::new(storage))))
    }

    async fn create_managed(
        &self,
        provider_id: &StorageProviderId,
        directory_name: &WorkspaceDirectoryName,
    ) -> Result<(WorkspaceStorageBinding, Arc<WorkspaceStorageSession>), StorageError> {
        let request = WorkspaceStorageBindingRequest {
            provider_id: provider_id.clone(),
            provider_schema_version: LOCAL_FS_PROVIDER_SCHEMA_VERSION,
            location: WorkspaceStorageLocation::Managed {
                directory_name: directory_name.clone(),
            },
        };
        let root = self.resolve_root(
            &request.provider_id,
            request.provider_schema_version,
            &request.location,
        )?;
        if root.exists() {
            return Err(StorageError::AlreadyExists {
                path: WorkspaceRelativePath::root(),
            });
        }
        std::fs::create_dir_all(&root).map_err(|error| map_root_io("create_managed", error))?;
        let storage = LocalPathStorage::open(root)?;
        let binding = request.resolve(self.identity_for_root(storage.root_path())?);
        Ok((
            binding,
            Arc::new(WorkspaceStorageSession::new(Arc::new(storage))),
        ))
    }

    async fn remove_workspace_root(
        &self,
        binding: &WorkspaceStorageBinding,
    ) -> Result<(), StorageError> {
        let root = self.resolve_root(
            &binding.provider_id,
            binding.provider_schema_version,
            &binding.location,
        )?;
        if !root.exists() {
            return Err(StorageError::NotFound {
                path: WorkspaceRelativePath::root(),
            });
        }
        let metadata = std::fs::symlink_metadata(&root)
            .map_err(|error| map_root_io("metadata_remove_root", error))?;
        if metadata.file_type().is_symlink() {
            return Err(StorageError::OutsideWorkspace {
                path: WorkspaceRelativePath::root(),
            });
        }
        let canonical = std::fs::canonicalize(&root)
            .map_err(|error| map_root_io("canonicalize_remove_root", error))?;
        std::fs::remove_dir_all(canonical)
            .map_err(|error| map_root_io("remove_workspace_root", error))
    }
}

fn metadata_to_entry(metadata: &std::fs::Metadata) -> StorageEntryMetadata {
    let kind = if metadata.is_dir() {
        StorageEntryKind::Directory
    } else {
        StorageEntryKind::File
    };
    StorageEntryMetadata {
        kind,
        size: (kind == StorageEntryKind::File).then_some(metadata.len()),
        created_at: metadata
            .created()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs()),
        modified_at: metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_secs()),
    }
}

fn map_path_io(
    path: &WorkspaceRelativePath,
    operation: &'static str,
    error: std::io::Error,
) -> StorageError {
    match error.kind() {
        ErrorKind::NotFound => StorageError::NotFound { path: path.clone() },
        ErrorKind::AlreadyExists => StorageError::AlreadyExists { path: path.clone() },
        ErrorKind::NotADirectory => StorageError::NotDirectory { path: path.clone() },
        ErrorKind::IsADirectory => StorageError::IsDirectory { path: path.clone() },
        ErrorKind::DirectoryNotEmpty => StorageError::DirectoryNotEmpty { path: path.clone() },
        _ => StorageError::io(operation, error),
    }
}

fn map_root_io(operation: &'static str, error: std::io::Error) -> StorageError {
    match error.kind() {
        ErrorKind::NotFound => StorageError::NotFound {
            path: WorkspaceRelativePath::root(),
        },
        ErrorKind::AlreadyExists => StorageError::AlreadyExists {
            path: WorkspaceRelativePath::root(),
        },
        ErrorKind::NotADirectory => StorageError::NotDirectory {
            path: WorkspaceRelativePath::root(),
        },
        _ => StorageError::io(operation, error),
    }
}

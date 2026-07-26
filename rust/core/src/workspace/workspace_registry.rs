use std::{
    collections::HashMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Arc,
};

use serde::{Deserialize, Serialize};

use crate::utils::time_utils::get_now_timestamp;

use super::{
    config::{
        get_workspace_global_config_path, initialize_workspace_files, load_workspace_manifest,
        save_workspace_manifest,
    },
    error::WorkspaceError,
    storage::{
        move_entry, LocalPathStorageFactory, MountedStorage, StorageEntryKind, WorkspaceStorage,
        WorkspaceStorageFactory, WriteOptions,
    },
    storage_mount::{
        StorageAvailability, StorageMountId, StorageMountKind, StorageMountRecord,
        StorageMountStatus,
    },
    workspace_id::WorkspaceId,
    workspace_locator::WorkspaceLocator,
    workspace_manifest::{WorkspaceManifest, WORKSPACE_MANIFEST_SCHEMA_VERSION},
    workspace_relative_path::{WorkspaceEntryName, WorkspaceRelativePath},
    workspace_savedata::WorkspaceSaveData,
    workspace_settings::WorkspaceSettings,
};

pub const WORKSPACE_REGISTRY_SCHEMA_VERSION: u32 = 2;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecord {
    pub id: WorkspaceId,
    pub name: String,
    pub locator: WorkspaceLocator,
    pub create_time: Option<u64>,
    pub update_time: Option<u64>,
    pub save_data: WorkspaceSaveData,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceRequest {
    pub name: String,
    pub mount_id: StorageMountId,
    pub parent_path: WorkspaceRelativePath,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachWorkspaceRequest {
    pub mount_id: StorageMountId,
    pub workspace_path: WorkspaceRelativePath,
    #[serde(default)]
    pub initialize_if_missing: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveWorkspaceRequest {
    pub workspace_id: WorkspaceId,
    pub destination_mount_id: StorageMountId,
    pub destination_parent_path: WorkspaceRelativePath,
    #[serde(default)]
    pub delete_source_after_commit: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveWorkspaceResult {
    pub record: WorkspaceRecord,
    pub source_locator: WorkspaceLocator,
    pub source_cleanup: WorkspaceCleanupStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "status",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum WorkspaceCleanupStatus {
    NotRequested,
    Removed,
    Failed { message: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveWorkspaceResult {
    pub record: WorkspaceRecord,
    pub file_cleanup: WorkspaceCleanupStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecordStatus {
    pub workspace_id: WorkspaceId,
    pub availability: WorkspaceRecordAvailability,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mount_status: Option<StorageMountStatus>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanStorageMountRequest {
    pub mount_id: StorageMountId,
    pub parent_path: WorkspaceRelativePath,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanStorageMountResult {
    pub mount_id: StorageMountId,
    pub parent_path: WorkspaceRelativePath,
    pub entries: Vec<WorkspaceScanEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceScanEntry {
    pub locator: WorkspaceLocator,
    pub status: WorkspaceScanEntryStatus,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub workspace_id: Option<WorkspaceId>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub create_time: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub registered_locator: Option<WorkspaceLocator>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WorkspaceScanEntryStatus {
    Ready,
    Registered,
    DuplicateWorkspaceId,
    ManifestMissing,
    UnsupportedManifestSchema,
    Invalid,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum WorkspaceRecordAvailability {
    Available,
    WorkspaceNotFound,
    MountNotFound,
    MountUnavailable,
    ManifestNotFound,
    WorkspaceIdMismatch,
    UnsupportedManifestSchema,
    Invalid,
}

#[derive(Debug)]
pub struct PreparedWorkspace {
    pub record: WorkspaceRecord,
    pub manifest: WorkspaceManifest,
    pub mounted_storage: MountedStorage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceRegistryFile {
    schema_version: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    last_workspace_id: Option<WorkspaceId>,
    #[serde(default)]
    mounts: HashMap<StorageMountId, StorageMountRecord>,
    #[serde(default)]
    workspace_records: HashMap<WorkspaceId, WorkspaceRecord>,
}

pub struct WorkspaceRegistry {
    pub schema_version: u32,
    pub last_workspace_id: Option<WorkspaceId>,
    pub mounts: HashMap<StorageMountId, StorageMountRecord>,
    pub workspace_records: HashMap<WorkspaceId, WorkspaceRecord>,
    storage_factory: Arc<dyn WorkspaceStorageFactory>,
    registry_path: Option<PathBuf>,
}

impl std::fmt::Debug for WorkspaceRegistry {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("WorkspaceRegistry")
            .field("schema_version", &self.schema_version)
            .field("last_workspace_id", &self.last_workspace_id)
            .field("mounts", &self.mounts)
            .field("workspace_records", &self.workspace_records)
            .finish_non_exhaustive()
    }
}

impl WorkspaceRegistry {
    pub fn new() -> Self {
        Self::load_with_storage_factory(Arc::new(LocalPathStorageFactory::new()))
    }

    pub fn with_storage_factory(storage_factory: Arc<dyn WorkspaceStorageFactory>) -> Self {
        Self {
            schema_version: WORKSPACE_REGISTRY_SCHEMA_VERSION,
            last_workspace_id: None,
            mounts: HashMap::new(),
            workspace_records: HashMap::new(),
            storage_factory,
            registry_path: None,
        }
    }

    pub fn load_with_storage_factory(storage_factory: Arc<dyn WorkspaceStorageFactory>) -> Self {
        let path = get_workspace_global_config_path();
        let Ok(data) = fs::read(&path) else {
            let mut registry = Self::with_storage_factory(storage_factory);
            registry.registry_path = Some(path);
            return registry;
        };
        let mut file = match serde_json::from_slice::<WorkspaceRegistryFile>(&data) {
            Ok(file) if file.schema_version == WORKSPACE_REGISTRY_SCHEMA_VERSION => file,
            Ok(file) => {
                log::warn!(
                    "忽略不受支持的 workspace registry schema: {}",
                    file.schema_version
                );
                let mut registry = Self::with_storage_factory(storage_factory);
                registry.registry_path = Some(path);
                return registry;
            }
            Err(error) => {
                log::warn!("读取 workspace registry v2 失败: {error}");
                let mut registry = Self::with_storage_factory(storage_factory);
                registry.registry_path = Some(path);
                return registry;
            }
        };
        file.workspace_records.retain(|workspace_id, record| {
            if workspace_id != &record.id {
                log::warn!(
                    "跳过 registry key 与 record ID 不一致的 Workspace: key={}, record={}",
                    workspace_id,
                    record.id
                );
                return false;
            }
            record.save_data.id = workspace_id.clone();
            true
        });
        if file
            .last_workspace_id
            .as_ref()
            .is_some_and(|id| !file.workspace_records.contains_key(id))
        {
            file.last_workspace_id = None;
        }

        Self {
            schema_version: file.schema_version,
            last_workspace_id: file.last_workspace_id,
            mounts: file.mounts,
            workspace_records: file.workspace_records,
            storage_factory,
            registry_path: Some(path),
        }
    }

    pub async fn register_mount(
        &mut self,
        mount: StorageMountRecord,
    ) -> Result<(), WorkspaceError> {
        mount.validate()?;
        if let Some(existing) = self.mounts.get(&mount.id) {
            if existing == &mount {
                return Ok(());
            }
            return Err(WorkspaceError::AlreadyExistMount(mount.id));
        }
        let mut mounts = self.mounts.clone();
        mounts.insert(mount.id.clone(), mount);
        self.commit_snapshot(
            self.last_workspace_id.clone(),
            mounts,
            self.workspace_records.clone(),
        )
    }

    pub async fn reauthorize_mount(
        &mut self,
        mount_id: &StorageMountId,
        kind: StorageMountKind,
    ) -> Result<StorageMountRecord, WorkspaceError> {
        let existing = self
            .mounts
            .get(mount_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundMount(mount_id.clone()))?;
        if !existing.kind.is_same_type(&kind) {
            return Err(WorkspaceError::MountKindMismatch {
                from_kind: mount_kind_name(&existing.kind),
                to_kind: mount_kind_name(&kind),
            });
        }

        let updated = StorageMountRecord { kind, ..existing };
        updated.validate()?;
        let mut mounts = self.mounts.clone();
        mounts.insert(mount_id.clone(), updated.clone());
        self.commit_snapshot(
            self.last_workspace_id.clone(),
            mounts,
            self.workspace_records.clone(),
        )?;
        Ok(updated)
    }

    pub async fn remove_mount(&mut self, mount_id: &StorageMountId) -> Result<(), WorkspaceError> {
        if self
            .workspace_records
            .values()
            .any(|record| &record.locator.mount_id == mount_id)
        {
            return Err(WorkspaceError::MountInUse(mount_id.clone()));
        }
        let mut mounts = self.mounts.clone();
        mounts
            .remove(mount_id)
            .ok_or_else(|| WorkspaceError::NotFoundMount(mount_id.clone()))?;
        self.commit_snapshot(
            self.last_workspace_id.clone(),
            mounts,
            self.workspace_records.clone(),
        )
    }

    pub fn list_mounts(&self) -> Vec<StorageMountRecord> {
        let mut mounts = self.mounts.values().cloned().collect::<Vec<_>>();
        mounts.sort_by(|left, right| {
            left.display_name
                .cmp(&right.display_name)
                .then_with(|| left.id.cmp(&right.id))
        });
        mounts
    }

    pub async fn get_mount_status(
        &self,
        mount_id: &StorageMountId,
    ) -> Result<StorageMountStatus, WorkspaceError> {
        let mount = self
            .mounts
            .get(mount_id)
            .ok_or_else(|| WorkspaceError::NotFoundMount(mount_id.clone()))?;
        match self.storage_factory.open_mount(mount).await {
            Ok(storage) => {
                let storage = storage.storage();
                let capabilities = match storage.capabilities().await {
                    Ok(capabilities) => capabilities,
                    Err(error) => {
                        return Ok(StorageMountStatus {
                            mount_id: mount_id.clone(),
                            availability: error.availability(),
                            capabilities: None,
                            message: Some(error.to_string()),
                        });
                    }
                };
                match storage.exists(&WorkspaceRelativePath::root()).await {
                    Ok(true) => Ok(StorageMountStatus {
                        mount_id: mount_id.clone(),
                        availability: StorageAvailability::Available,
                        capabilities: Some(capabilities),
                        message: None,
                    }),
                    Ok(false) => Ok(StorageMountStatus {
                        mount_id: mount_id.clone(),
                        availability: StorageAvailability::NotFound,
                        capabilities: Some(capabilities),
                        message: Some("Storage mount 根目录不存在".to_string()),
                    }),
                    Err(error) => Ok(StorageMountStatus {
                        mount_id: mount_id.clone(),
                        availability: error.availability(),
                        capabilities: Some(capabilities),
                        message: Some(error.to_string()),
                    }),
                }
            }
            Err(error) => Ok(StorageMountStatus {
                mount_id: mount_id.clone(),
                availability: error.availability(),
                capabilities: None,
                message: Some(error.to_string()),
            }),
        }
    }

    pub async fn list_mount_statuses(&self) -> Vec<StorageMountStatus> {
        let mut statuses = Vec::with_capacity(self.mounts.len());
        for mount in self.list_mounts() {
            if let Ok(status) = self.get_mount_status(&mount.id).await {
                statuses.push(status);
            }
        }
        statuses
    }

    /// 扫描调用方明确指定的 managed parent，只检查 direct children。
    ///
    /// 这个操作不会初始化目录，也不会修改 registry；UI 应在用户确认后调用
    /// `attach_workspace`。自定义授权目录本身就是 Workspace 时应直接 attach。
    pub async fn scan_mount(
        &self,
        request: ScanStorageMountRequest,
    ) -> Result<ScanStorageMountResult, WorkspaceError> {
        let mount = self
            .mounts
            .get(&request.mount_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundMount(request.mount_id.clone()))?;
        let mounted = self.storage_factory.open_mount(&mount).await?;
        let storage = mounted.storage();
        let parent_metadata = storage.metadata(&request.parent_path).await?;
        if parent_metadata.kind != StorageEntryKind::Directory {
            return Err(super::storage::StorageError::NotDirectory {
                path: request.parent_path,
            }
            .into());
        }

        let mut entries = Vec::new();
        for entry in storage.list_dir(&request.parent_path).await? {
            if entry.path.parent().as_ref() != Some(&request.parent_path) {
                return Err(super::storage::StorageError::OutsideMount { path: entry.path }.into());
            }
            if entry.metadata.kind != StorageEntryKind::Directory {
                continue;
            }

            let locator = WorkspaceLocator::new(request.mount_id.clone(), entry.path.clone());
            let scoped_storage =
                super::storage::ScopedStorage::new(Arc::clone(&storage), entry.path.clone());
            let scanned = match load_workspace_manifest(&scoped_storage).await {
                Ok(Some(manifest)) => {
                    let name = entry
                        .path
                        .file_name()
                        .unwrap_or(mount.display_name.as_str())
                        .to_string();
                    match validate_manifest(&manifest) {
                        Ok(()) => match self.workspace_records.get(&manifest.id) {
                            Some(record) if record.locator == locator => WorkspaceScanEntry {
                                locator,
                                status: WorkspaceScanEntryStatus::Registered,
                                workspace_id: Some(manifest.id),
                                name: Some(name),
                                create_time: Some(manifest.create_time),
                                registered_locator: Some(record.locator.clone()),
                                message: None,
                            },
                            Some(record) => WorkspaceScanEntry {
                                locator,
                                status: WorkspaceScanEntryStatus::DuplicateWorkspaceId,
                                workspace_id: Some(manifest.id),
                                name: Some(name),
                                create_time: Some(manifest.create_time),
                                registered_locator: Some(record.locator.clone()),
                                message: Some("该 Workspace ID 已在另一个位置注册".to_string()),
                            },
                            None => WorkspaceScanEntry {
                                locator,
                                status: WorkspaceScanEntryStatus::Ready,
                                workspace_id: Some(manifest.id),
                                name: Some(name),
                                create_time: Some(manifest.create_time),
                                registered_locator: None,
                                message: None,
                            },
                        },
                        Err(WorkspaceError::UnsupportedManifestSchema(schema_version)) => {
                            WorkspaceScanEntry {
                                locator,
                                status: WorkspaceScanEntryStatus::UnsupportedManifestSchema,
                                workspace_id: Some(manifest.id),
                                name: Some(name),
                                create_time: Some(manifest.create_time),
                                registered_locator: None,
                                message: Some(format!(
                                    "Workspace manifest schema 不受支持: {schema_version}"
                                )),
                            }
                        }
                        Err(error) => WorkspaceScanEntry {
                            locator,
                            status: WorkspaceScanEntryStatus::Invalid,
                            workspace_id: Some(manifest.id),
                            name: Some(name),
                            create_time: Some(manifest.create_time),
                            registered_locator: None,
                            message: Some(error.to_string()),
                        },
                    }
                }
                Ok(None) => WorkspaceScanEntry {
                    locator,
                    status: WorkspaceScanEntryStatus::ManifestMissing,
                    workspace_id: None,
                    name: entry.path.file_name().map(ToOwned::to_owned),
                    create_time: None,
                    registered_locator: None,
                    message: Some("Workspace manifest 不存在".to_string()),
                },
                Err(error) => WorkspaceScanEntry {
                    locator,
                    status: WorkspaceScanEntryStatus::Invalid,
                    workspace_id: None,
                    name: entry.path.file_name().map(ToOwned::to_owned),
                    create_time: None,
                    registered_locator: None,
                    message: Some(error.to_string()),
                },
            };
            entries.push(scanned);
        }
        entries.sort_by(|left, right| left.locator.relative_path.cmp(&right.locator.relative_path));

        Ok(ScanStorageMountResult {
            mount_id: request.mount_id,
            parent_path: request.parent_path,
            entries,
        })
    }

    pub async fn create_workspace(
        &mut self,
        request: CreateWorkspaceRequest,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        let name = WorkspaceEntryName::parse(request.name)
            .map_err(|error| WorkspaceError::InvalidName(error.to_string()))?;
        let workspace_path = request.parent_path.join_name(&name);
        if self.workspace_records.values().any(|record| {
            record.locator.mount_id == request.mount_id
                && record.locator.relative_path == workspace_path
        }) {
            return Err(WorkspaceError::AlreadyExistLocator);
        }

        let mount = self
            .mounts
            .get(&request.mount_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundMount(request.mount_id.clone()))?;
        let mounted = self.storage_factory.open_mount(&mount).await?;
        let mount_storage = mounted.storage();
        if mount_storage.exists(&workspace_path).await? {
            return Err(WorkspaceError::AlreadyExistLocator);
        }

        let temp_name = WorkspaceEntryName::parse(format!(
            ".{}.lonanote-creating-{}",
            name.as_str(),
            uuid::Uuid::new_v4().hyphenated()
        ))?;
        let temp_path = request.parent_path.join_name(&temp_name);
        mount_storage.create_dir_all(&temp_path).await?;

        let scoped = mounted.into_scoped(temp_path.clone());
        let workspace_storage = scoped.storage();
        let now = get_now_timestamp();
        let id = WorkspaceId::new();
        let manifest = WorkspaceManifest::new(id.clone(), now);
        if let Err(error) = initialize_workspace_files(workspace_storage.as_ref(), &manifest).await
        {
            let _ = mount_storage.remove(&temp_path, true).await;
            return Err(error);
        }
        if let Err(error) = move_entry(mount_storage.as_ref(), &temp_path, &workspace_path).await {
            let temp_cleanup = mount_storage.remove(&temp_path, true).await;
            let destination_cleanup =
                if mount_storage.exists(&workspace_path).await.unwrap_or(false) {
                    mount_storage.remove(&workspace_path, true).await
                } else {
                    Ok(())
                };
            if temp_cleanup.is_err() || destination_cleanup.is_err() {
                return Err(WorkspaceError::MigrationIncomplete {
                    stage: "create temporary commit rollback",
                    message: format!(
                        "提交失败: {error}; 临时目录清理: {temp_cleanup:?}; 目标目录清理: {destination_cleanup:?}"
                    ),
                });
            }
            return Err(error.into());
        }

        let record = WorkspaceRecord {
            id: id.clone(),
            name: name.into_string(),
            locator: WorkspaceLocator::new(request.mount_id, workspace_path.clone()),
            create_time: Some(now),
            update_time: Some(now),
            save_data: WorkspaceSaveData::new(id.clone()),
        };
        let mut records = self.workspace_records.clone();
        records.insert(id, record.clone());
        if let Err(error) =
            self.commit_snapshot(self.last_workspace_id.clone(), self.mounts.clone(), records)
        {
            if let Err(cleanup_error) = mount_storage.remove(&workspace_path, true).await {
                return Err(WorkspaceError::MigrationIncomplete {
                    stage: "create registry commit rollback",
                    message: format!(
                        "registry 提交失败: {error}; 新建目录清理失败: {cleanup_error}"
                    ),
                });
            }
            return Err(error);
        }

        Ok(record)
    }

    pub async fn attach_workspace(
        &mut self,
        request: AttachWorkspaceRequest,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        let mount = self
            .mounts
            .get(&request.mount_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundMount(request.mount_id.clone()))?;
        let mounted = self.storage_factory.open_mount(&mount).await?;
        if !mounted.storage().exists(&request.workspace_path).await? {
            return Err(super::storage::StorageError::NotFound {
                path: request.workspace_path,
            }
            .into());
        }
        let scoped = mounted.into_scoped(request.workspace_path.clone());
        let storage = scoped.storage();
        let manifest = match load_workspace_manifest(storage.as_ref()).await? {
            Some(manifest) => manifest,
            None if request.initialize_if_missing => {
                let manifest = WorkspaceManifest::new(WorkspaceId::new(), get_now_timestamp());
                initialize_workspace_files(storage.as_ref(), &manifest).await?;
                manifest
            }
            None => return Err(WorkspaceError::ManifestNotFound),
        };
        validate_manifest(&manifest)?;

        if let Some(existing) = self.workspace_records.get(&manifest.id) {
            if existing.locator.mount_id != request.mount_id
                || existing.locator.relative_path != request.workspace_path
            {
                return Err(WorkspaceError::AlreadyExistWorkspace(manifest.id));
            }
            return Ok(existing.clone());
        }

        let name = request
            .workspace_path
            .file_name()
            .unwrap_or(mount.display_name.as_str())
            .to_string();
        let now = get_now_timestamp();
        let record = WorkspaceRecord {
            id: manifest.id.clone(),
            name,
            locator: WorkspaceLocator::new(request.mount_id, request.workspace_path),
            create_time: Some(manifest.create_time),
            update_time: Some(now),
            save_data: WorkspaceSaveData::new(manifest.id.clone()),
        };
        let mut records = self.workspace_records.clone();
        records.insert(manifest.id, record.clone());
        self.commit_snapshot(self.last_workspace_id.clone(), self.mounts.clone(), records)?;
        Ok(record)
    }

    pub fn list_workspace_records(&self) -> Vec<WorkspaceRecord> {
        let mut records = self.workspace_records.values().cloned().collect::<Vec<_>>();
        records.sort_by(|left, right| {
            left.name
                .cmp(&right.name)
                .then_with(|| left.id.cmp(&right.id))
        });
        records
    }

    pub fn get_workspace_record(&self, workspace_id: &WorkspaceId) -> Option<&WorkspaceRecord> {
        self.workspace_records.get(workspace_id)
    }

    pub async fn get_workspace_status(&self, workspace_id: &WorkspaceId) -> WorkspaceRecordStatus {
        let Some(record) = self.workspace_records.get(workspace_id) else {
            return WorkspaceRecordStatus {
                workspace_id: workspace_id.clone(),
                availability: WorkspaceRecordAvailability::WorkspaceNotFound,
                mount_status: None,
                message: Some(format!("Workspace 不存在: {workspace_id}")),
            };
        };
        let Some(mount) = self.mounts.get(&record.locator.mount_id) else {
            return WorkspaceRecordStatus {
                workspace_id: workspace_id.clone(),
                availability: WorkspaceRecordAvailability::MountNotFound,
                mount_status: None,
                message: Some(format!("Storage mount 不存在: {}", record.locator.mount_id)),
            };
        };

        let mount_status = self.get_mount_status(&mount.id).await.ok();
        if mount_status
            .as_ref()
            .is_some_and(|status| status.availability != StorageAvailability::Available)
        {
            return WorkspaceRecordStatus {
                workspace_id: workspace_id.clone(),
                availability: WorkspaceRecordAvailability::MountUnavailable,
                message: mount_status
                    .as_ref()
                    .and_then(|status| status.message.clone()),
                mount_status,
            };
        }

        match self.open_record(workspace_id).await {
            Ok(_) => WorkspaceRecordStatus {
                workspace_id: workspace_id.clone(),
                availability: WorkspaceRecordAvailability::Available,
                mount_status,
                message: None,
            },
            Err(error) => {
                let availability = match &error {
                    WorkspaceError::NotFoundWorkspace(_) => {
                        WorkspaceRecordAvailability::WorkspaceNotFound
                    }
                    WorkspaceError::NotFoundMount(_) => WorkspaceRecordAvailability::MountNotFound,
                    WorkspaceError::ManifestNotFound => {
                        WorkspaceRecordAvailability::ManifestNotFound
                    }
                    WorkspaceError::WorkspaceIdMismatch { .. } => {
                        WorkspaceRecordAvailability::WorkspaceIdMismatch
                    }
                    WorkspaceError::UnsupportedManifestSchema(_) => {
                        WorkspaceRecordAvailability::UnsupportedManifestSchema
                    }
                    WorkspaceError::Storage(_) => WorkspaceRecordAvailability::MountUnavailable,
                    _ => WorkspaceRecordAvailability::Invalid,
                };
                WorkspaceRecordStatus {
                    workspace_id: workspace_id.clone(),
                    availability,
                    mount_status,
                    message: Some(error.to_string()),
                }
            }
        }
    }

    pub async fn list_workspace_statuses(&self) -> Vec<WorkspaceRecordStatus> {
        let mut statuses = Vec::with_capacity(self.workspace_records.len());
        for record in self.list_workspace_records() {
            statuses.push(self.get_workspace_status(&record.id).await);
        }
        statuses
    }

    pub fn get_last_workspace_id(&self) -> Option<WorkspaceId> {
        self.last_workspace_id.clone()
    }

    pub async fn prepare_workspace_open(
        &mut self,
        workspace_id: &WorkspaceId,
    ) -> Result<PreparedWorkspace, WorkspaceError> {
        let prepared = self.open_record(workspace_id).await?;
        let now = get_now_timestamp();
        let mut records = self.workspace_records.clone();
        let record = records
            .get_mut(workspace_id)
            .ok_or_else(|| WorkspaceError::NotFoundWorkspace(workspace_id.clone()))?;
        record.update_time = Some(now);
        let record = record.clone();
        self.commit_snapshot(Some(workspace_id.clone()), self.mounts.clone(), records)?;

        Ok(PreparedWorkspace { record, ..prepared })
    }

    pub async fn get_workspace_settings(
        &self,
        workspace_id: &WorkspaceId,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        Ok(self.open_record(workspace_id).await?.manifest.settings)
    }

    pub async fn set_workspace_settings(
        &mut self,
        workspace_id: &WorkspaceId,
        settings: WorkspaceSettings,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        let prepared = self.open_record(workspace_id).await?;
        let mut manifest = prepared.manifest;
        manifest.settings = settings.clone();
        save_workspace_manifest(prepared.mounted_storage.storage().as_ref(), &manifest).await?;
        let mut records = self.workspace_records.clone();
        let record = records
            .get_mut(workspace_id)
            .ok_or_else(|| WorkspaceError::NotFoundWorkspace(workspace_id.clone()))?;
        record.update_time = Some(get_now_timestamp());
        self.commit_snapshot(self.last_workspace_id.clone(), self.mounts.clone(), records)?;
        Ok(settings)
    }

    pub fn get_workspace_savedata(
        &self,
        workspace_id: &WorkspaceId,
    ) -> Result<&WorkspaceSaveData, WorkspaceError> {
        self.workspace_records
            .get(workspace_id)
            .map(|record| &record.save_data)
            .ok_or_else(|| WorkspaceError::NotFoundWorkspace(workspace_id.clone()))
    }

    pub fn set_workspace_savedata(
        &mut self,
        workspace_id: &WorkspaceId,
        mut save_data: WorkspaceSaveData,
    ) -> Result<(), WorkspaceError> {
        let mut records = self.workspace_records.clone();
        let record = records
            .get_mut(workspace_id)
            .ok_or_else(|| WorkspaceError::NotFoundWorkspace(workspace_id.clone()))?;
        save_data.id = workspace_id.clone();
        record.save_data = save_data;
        self.commit_snapshot(self.last_workspace_id.clone(), self.mounts.clone(), records)
    }

    pub async fn rename_workspace(
        &mut self,
        workspace_id: &WorkspaceId,
        new_name: String,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        let name = WorkspaceEntryName::parse(new_name)
            .map_err(|error| WorkspaceError::InvalidName(error.to_string()))?;
        let record = self
            .workspace_records
            .get(workspace_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundWorkspace(workspace_id.clone()))?;
        let parent = record
            .locator
            .relative_path
            .parent()
            .unwrap_or_else(WorkspaceRelativePath::root);
        let destination = parent.join_name(&name);
        if self.workspace_records.values().any(|candidate| {
            candidate.id != *workspace_id
                && candidate.locator.mount_id == record.locator.mount_id
                && candidate.locator.relative_path == destination
        }) {
            return Err(WorkspaceError::AlreadyExistLocator);
        }

        let mount = self
            .mounts
            .get(&record.locator.mount_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundMount(record.locator.mount_id.clone()))?;
        let mounted = self.storage_factory.open_mount(&mount).await?;
        let storage = mounted.storage();
        move_entry(
            storage.as_ref(),
            &record.locator.relative_path,
            &destination,
        )
        .await?;

        let mut records = self.workspace_records.clone();
        let updated_record = records
            .get_mut(workspace_id)
            .expect("workspace record checked");
        updated_record.name = name.into_string();
        updated_record.locator.relative_path = destination.clone();
        updated_record.update_time = Some(get_now_timestamp());
        let updated = updated_record.clone();
        if let Err(error) =
            self.commit_snapshot(self.last_workspace_id.clone(), self.mounts.clone(), records)
        {
            if let Err(rollback_error) = move_entry(
                storage.as_ref(),
                &destination,
                &record.locator.relative_path,
            )
            .await
            {
                return Err(WorkspaceError::MigrationIncomplete {
                    stage: "rename registry commit rollback",
                    message: format!(
                        "registry 提交失败: {error}; 目录名回滚失败: {rollback_error}"
                    ),
                });
            }
            return Err(error);
        }
        Ok(updated)
    }

    pub async fn move_workspace(
        &mut self,
        request: MoveWorkspaceRequest,
    ) -> Result<MoveWorkspaceResult, WorkspaceError> {
        let source_record = self
            .workspace_records
            .get(&request.workspace_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundWorkspace(request.workspace_id.clone()))?;
        let source_mount = self
            .mounts
            .get(&source_record.locator.mount_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundMount(source_record.locator.mount_id.clone()))?;
        let destination_mount = self
            .mounts
            .get(&request.destination_mount_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundMount(request.destination_mount_id.clone()))?;
        let name = WorkspaceEntryName::parse(source_record.name.clone())
            .map_err(|error| WorkspaceError::InvalidName(error.to_string()))?;
        let destination_path = request.destination_parent_path.join_name(&name);
        if source_record.locator.mount_id == request.destination_mount_id
            && source_record.locator.relative_path == destination_path
        {
            return Ok(MoveWorkspaceResult {
                record: source_record.clone(),
                source_locator: source_record.locator,
                source_cleanup: WorkspaceCleanupStatus::NotRequested,
            });
        }

        let source_mounted = self.storage_factory.open_mount(&source_mount).await?;
        let source_mount_storage = source_mounted.storage();
        let source_scoped = source_mounted.into_scoped(source_record.locator.relative_path.clone());
        let source_storage = source_scoped.storage();
        let destination_mounted = self.storage_factory.open_mount(&destination_mount).await?;
        let destination_mount_storage = destination_mounted.storage();
        if destination_mount_storage.exists(&destination_path).await? {
            return Err(WorkspaceError::AlreadyExistLocator);
        }

        let parent = destination_path
            .parent()
            .unwrap_or_else(WorkspaceRelativePath::root);
        let temp_name = WorkspaceEntryName::parse(format!(
            ".{}.lonanote-moving-{}",
            name.as_str(),
            uuid::Uuid::new_v4().hyphenated()
        ))?;
        let temp_path = parent.join_name(&temp_name);
        destination_mount_storage.create_dir_all(&temp_path).await?;
        let destination_scoped = destination_mounted.into_scoped(temp_path.clone());
        let destination_storage = destination_scoped.storage();

        let source_summary =
            match copy_storage_tree(source_storage.as_ref(), destination_storage.as_ref()).await {
                Ok(summary) => summary,
                Err(error) => {
                    let _ = destination_mount_storage.remove(&temp_path, true).await;
                    return Err(error);
                }
            };
        let destination_summary = match summarize_storage_tree(destination_storage.as_ref()).await {
            Ok(summary) => summary,
            Err(error) => {
                let _ = destination_mount_storage.remove(&temp_path, true).await;
                return Err(error);
            }
        };
        if source_summary != destination_summary {
            let _ = destination_mount_storage.remove(&temp_path, true).await;
            return Err(WorkspaceError::MigrationIncomplete {
                stage: "copy verification",
                message: format!(
                    "源统计 {source_summary:?} 与目标统计 {destination_summary:?} 不一致"
                ),
            });
        }
        let copied_manifest = match load_workspace_manifest(destination_storage.as_ref()).await {
            Ok(Some(manifest)) => manifest,
            Ok(None) => {
                let _ = destination_mount_storage.remove(&temp_path, true).await;
                return Err(WorkspaceError::ManifestNotFound);
            }
            Err(error) => {
                let _ = destination_mount_storage.remove(&temp_path, true).await;
                return Err(error);
            }
        };
        if copied_manifest.id != request.workspace_id {
            let _ = destination_mount_storage.remove(&temp_path, true).await;
            return Err(WorkspaceError::WorkspaceIdMismatch {
                expected: request.workspace_id,
                actual: copied_manifest.id,
            });
        }
        if let Err(error) = move_entry(
            destination_mount_storage.as_ref(),
            &temp_path,
            &destination_path,
        )
        .await
        {
            let _ = destination_mount_storage.remove(&temp_path, true).await;
            if destination_mount_storage
                .exists(&destination_path)
                .await
                .unwrap_or(false)
            {
                let _ = destination_mount_storage
                    .remove(&destination_path, true)
                    .await;
            }
            return Err(error.into());
        }

        let mut records = self.workspace_records.clone();
        let record = records
            .get_mut(&source_record.id)
            .expect("workspace record checked");
        record.locator =
            WorkspaceLocator::new(request.destination_mount_id, destination_path.clone());
        record.update_time = Some(get_now_timestamp());
        let updated = record.clone();
        if let Err(error) =
            self.commit_snapshot(self.last_workspace_id.clone(), self.mounts.clone(), records)
        {
            if let Err(cleanup_error) = destination_mount_storage
                .remove(&destination_path, true)
                .await
            {
                return Err(WorkspaceError::MigrationIncomplete {
                    stage: "move registry commit rollback",
                    message: format!(
                        "registry 提交失败: {error}; 目标目录清理失败: {cleanup_error}"
                    ),
                });
            }
            return Err(error);
        }

        let source_cleanup = if request.delete_source_after_commit {
            match source_mount_storage
                .remove(&source_record.locator.relative_path, true)
                .await
            {
                Ok(()) => WorkspaceCleanupStatus::Removed,
                Err(error) => WorkspaceCleanupStatus::Failed {
                    message: error.to_string(),
                },
            }
        } else {
            WorkspaceCleanupStatus::NotRequested
        };

        Ok(MoveWorkspaceResult {
            record: updated,
            source_locator: source_record.locator,
            source_cleanup,
        })
    }

    pub async fn remove_workspace(
        &mut self,
        workspace_id: &WorkspaceId,
        delete_files: bool,
    ) -> Result<RemoveWorkspaceResult, WorkspaceError> {
        let record = self
            .workspace_records
            .get(workspace_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundWorkspace(workspace_id.clone()))?;
        let mut records = self.workspace_records.clone();
        records.remove(workspace_id);
        let last_workspace_id = self
            .last_workspace_id
            .clone()
            .filter(|last_id| last_id != workspace_id);
        self.commit_snapshot(last_workspace_id, self.mounts.clone(), records)?;

        let file_cleanup = if delete_files {
            match self.mounts.get(&record.locator.mount_id).cloned() {
                Some(mount) => match self.storage_factory.open_mount(&mount).await {
                    Ok(mounted) => match mounted
                        .storage()
                        .remove(&record.locator.relative_path, true)
                        .await
                    {
                        Ok(()) => WorkspaceCleanupStatus::Removed,
                        Err(error) => WorkspaceCleanupStatus::Failed {
                            message: error.to_string(),
                        },
                    },
                    Err(error) => WorkspaceCleanupStatus::Failed {
                        message: error.to_string(),
                    },
                },
                None => WorkspaceCleanupStatus::Failed {
                    message: WorkspaceError::NotFoundMount(record.locator.mount_id.clone())
                        .to_string(),
                },
            }
        } else {
            WorkspaceCleanupStatus::NotRequested
        };

        Ok(RemoveWorkspaceResult {
            record,
            file_cleanup,
        })
    }

    fn commit_snapshot(
        &mut self,
        last_workspace_id: Option<WorkspaceId>,
        mounts: HashMap<StorageMountId, StorageMountRecord>,
        workspace_records: HashMap<WorkspaceId, WorkspaceRecord>,
    ) -> Result<(), WorkspaceError> {
        self.persist_snapshot(&last_workspace_id, &mounts, &workspace_records)?;
        self.last_workspace_id = last_workspace_id;
        self.mounts = mounts;
        self.workspace_records = workspace_records;
        Ok(())
    }

    fn persist_snapshot(
        &self,
        last_workspace_id: &Option<WorkspaceId>,
        mounts: &HashMap<StorageMountId, StorageMountRecord>,
        workspace_records: &HashMap<WorkspaceId, WorkspaceRecord>,
    ) -> Result<(), WorkspaceError> {
        let Some(path) = self.registry_path.as_ref() else {
            return Ok(());
        };
        let parent = path
            .parent()
            .ok_or_else(|| WorkspaceError::RegistryIo("registry path 没有父目录".to_string()))?;
        fs::create_dir_all(parent)
            .map_err(|error| WorkspaceError::RegistryIo(error.to_string()))?;
        let file = WorkspaceRegistryFile {
            schema_version: self.schema_version,
            last_workspace_id: last_workspace_id.clone(),
            mounts: mounts.clone(),
            workspace_records: workspace_records.clone(),
        };
        let data = serde_json::to_vec_pretty(&file)
            .map_err(|error| WorkspaceError::Json(error.to_string()))?;
        write_registry_atomically(path, &data)
    }

    async fn open_record(
        &self,
        workspace_id: &WorkspaceId,
    ) -> Result<PreparedWorkspace, WorkspaceError> {
        let record = self
            .workspace_records
            .get(workspace_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundWorkspace(workspace_id.clone()))?;
        let mount = self
            .mounts
            .get(&record.locator.mount_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::NotFoundMount(record.locator.mount_id.clone()))?;
        let mounted = self
            .storage_factory
            .open_mount(&mount)
            .await?
            .into_scoped(record.locator.relative_path.clone());
        let manifest = load_workspace_manifest(mounted.storage().as_ref())
            .await?
            .ok_or(WorkspaceError::ManifestNotFound)?;
        validate_manifest(&manifest)?;
        if manifest.id != *workspace_id {
            return Err(WorkspaceError::WorkspaceIdMismatch {
                expected: workspace_id.clone(),
                actual: manifest.id,
            });
        }

        Ok(PreparedWorkspace {
            record,
            manifest,
            mounted_storage: mounted,
        })
    }
}

fn write_registry_atomically(path: &Path, data: &[u8]) -> Result<(), WorkspaceError> {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| WorkspaceError::RegistryIo("registry 文件名不是 UTF-8".to_string()))?;
    let temp_path = path.with_file_name(format!(
        ".{file_name}.tmp-{}",
        uuid::Uuid::new_v4().hyphenated()
    ));

    let result = (|| {
        let mut file = fs::File::create(&temp_path)
            .map_err(|error| WorkspaceError::RegistryIo(error.to_string()))?;
        file.write_all(data)
            .map_err(|error| WorkspaceError::RegistryIo(error.to_string()))?;
        file.sync_all()
            .map_err(|error| WorkspaceError::RegistryIo(error.to_string()))?;
        replace_registry_file(&temp_path, path)?;
        if let Some(parent) = path.parent() {
            if let Ok(directory) = fs::File::open(parent) {
                let _ = directory.sync_all();
            }
        }
        Ok(())
    })();

    if result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }
    result
}

#[cfg(not(target_os = "windows"))]
fn replace_registry_file(temp_path: &Path, path: &Path) -> Result<(), WorkspaceError> {
    fs::rename(temp_path, path).map_err(|error| WorkspaceError::RegistryIo(error.to_string()))
}

#[cfg(target_os = "windows")]
fn replace_registry_file(temp_path: &Path, path: &Path) -> Result<(), WorkspaceError> {
    let backup_path = path.with_extension("json.backup");
    let had_existing = path.exists();
    if had_existing {
        let _ = fs::remove_file(&backup_path);
        fs::rename(path, &backup_path)
            .map_err(|error| WorkspaceError::RegistryIo(error.to_string()))?;
    }

    if let Err(error) = fs::rename(temp_path, path) {
        if had_existing {
            let _ = fs::rename(&backup_path, path);
        }
        return Err(WorkspaceError::RegistryIo(error.to_string()));
    }
    if had_existing {
        let _ = fs::remove_file(backup_path);
    }
    Ok(())
}

impl Default for WorkspaceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

fn validate_manifest(manifest: &WorkspaceManifest) -> Result<(), WorkspaceError> {
    if manifest.schema_version != WORKSPACE_MANIFEST_SCHEMA_VERSION {
        return Err(WorkspaceError::UnsupportedManifestSchema(
            manifest.schema_version,
        ));
    }
    Ok(())
}

fn mount_kind_name(kind: &StorageMountKind) -> &'static str {
    match kind {
        StorageMountKind::DesktopAbsolute { .. } => "desktopAbsolute",
        StorageMountKind::DesktopDocuments => "desktopDocuments",
        StorageMountKind::IosAppDocuments => "iosAppDocuments",
        StorageMountKind::IosICloud { .. } => "iosICloud",
        StorageMountKind::IosBookmark { .. } => "iosBookmark",
        StorageMountKind::AndroidAppInternal => "androidAppInternal",
        StorageMountKind::AndroidDocumentTree { .. } => "androidDocumentTree",
    }
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
struct StorageTreeSummary {
    file_count: u64,
    directory_count: u64,
    known_size: u64,
}

async fn copy_storage_tree(
    source: &dyn WorkspaceStorage,
    destination: &dyn WorkspaceStorage,
) -> Result<StorageTreeSummary, WorkspaceError> {
    let mut summary = StorageTreeSummary::default();
    let mut pending_directories = vec![WorkspaceRelativePath::root()];
    while let Some(directory) = pending_directories.pop() {
        for entry in source.list_dir(&directory).await? {
            if entry.path.parent().as_ref() != Some(&directory) {
                return Err(super::storage::StorageError::OutsideMount { path: entry.path }.into());
            }
            match entry.metadata.kind {
                StorageEntryKind::Directory => {
                    destination.create_dir_all(&entry.path).await?;
                    pending_directories.push(entry.path);
                    summary.directory_count += 1;
                }
                StorageEntryKind::File => {
                    let data = source.read(&entry.path).await?;
                    summary.file_count += 1;
                    summary.known_size += data.len() as u64;
                    destination
                        .write(
                            &entry.path,
                            &data,
                            WriteOptions {
                                overwrite: false,
                                create_parent: true,
                            },
                        )
                        .await?;
                }
            }
        }
    }
    Ok(summary)
}

async fn summarize_storage_tree(
    storage: &dyn WorkspaceStorage,
) -> Result<StorageTreeSummary, WorkspaceError> {
    let mut summary = StorageTreeSummary::default();
    let mut pending_directories = vec![WorkspaceRelativePath::root()];
    while let Some(directory) = pending_directories.pop() {
        for entry in storage.list_dir(&directory).await? {
            if entry.path.parent().as_ref() != Some(&directory) {
                return Err(super::storage::StorageError::OutsideMount { path: entry.path }.into());
            }
            match entry.metadata.kind {
                StorageEntryKind::Directory => {
                    summary.directory_count += 1;
                    pending_directories.push(entry.path);
                }
                StorageEntryKind::File => {
                    summary.file_count += 1;
                    summary.known_size += storage.read(&entry.path).await?.len() as u64;
                }
            }
        }
    }
    Ok(summary)
}

#[cfg(test)]
mod tests {
    use async_trait::async_trait;

    use super::*;
    use crate::workspace::{
        storage::{
            MemoryStorage, MemoryStorageFactory, StorageCapabilities, StorageEntry,
            StorageEntryMetadata, StorageError,
        },
        storage_mount::StorageMountKind,
    };

    struct FaultStorage {
        inner: Arc<MemoryStorage>,
        fail_read: Option<WorkspaceRelativePath>,
        fail_remove: Option<WorkspaceRelativePath>,
    }

    #[async_trait]
    impl WorkspaceStorage for FaultStorage {
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
            if self.fail_read.as_ref() == Some(path) {
                return Err(StorageError::Io {
                    operation: "injected read",
                    message: path.to_string(),
                });
            }
            self.inner.read(path).await
        }

        async fn write(
            &self,
            path: &WorkspaceRelativePath,
            data: &[u8],
            options: WriteOptions,
        ) -> Result<(), StorageError> {
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
            if self.fail_remove.as_ref() == Some(path) {
                return Err(StorageError::Io {
                    operation: "injected remove",
                    message: path.to_string(),
                });
            }
            self.inner.remove(path, recursive).await
        }
    }

    struct FixedStorageFactory {
        storages: HashMap<StorageMountId, Arc<dyn WorkspaceStorage>>,
    }

    #[async_trait]
    impl WorkspaceStorageFactory for FixedStorageFactory {
        async fn open_mount(
            &self,
            mount: &StorageMountRecord,
        ) -> Result<MountedStorage, StorageError> {
            self.storages
                .get(&mount.id)
                .cloned()
                .map(MountedStorage::new)
                .ok_or(StorageError::ProviderUnavailable)
        }
    }

    fn mount(id: &str, name: &str) -> StorageMountRecord {
        StorageMountRecord {
            id: StorageMountId::parse(id).unwrap(),
            display_name: name.to_string(),
            kind: StorageMountKind::AndroidAppInternal,
            created_time: 1,
        }
    }

    #[tokio::test]
    async fn memory_registry_create_open_rename_move_remove() {
        let factory = Arc::new(MemoryStorageFactory::new());
        let mut registry = WorkspaceRegistry::with_storage_factory(factory.clone());
        registry
            .register_mount(mount("source", "Source"))
            .await
            .unwrap();
        registry
            .register_mount(mount("destination", "Destination"))
            .await
            .unwrap();

        let record = registry
            .create_workspace(CreateWorkspaceRequest {
                name: "alpha".to_string(),
                mount_id: StorageMountId::parse("source").unwrap(),
                parent_path: WorkspaceRelativePath::parse("workspaces").unwrap(),
            })
            .await
            .unwrap();
        let prepared = registry.prepare_workspace_open(&record.id).await.unwrap();
        assert_eq!(prepared.manifest.id, record.id);
        prepared
            .mounted_storage
            .storage()
            .write(
                &WorkspaceRelativePath::parse("notes/a.md").unwrap(),
                b"hello",
                WriteOptions::default(),
            )
            .await
            .unwrap();

        let renamed = registry
            .rename_workspace(&record.id, "beta".to_string())
            .await
            .unwrap();
        assert_eq!(renamed.name, "beta");

        let moved = registry
            .move_workspace(MoveWorkspaceRequest {
                workspace_id: record.id.clone(),
                destination_mount_id: StorageMountId::parse("destination").unwrap(),
                destination_parent_path: WorkspaceRelativePath::parse("workspaces").unwrap(),
                delete_source_after_commit: true,
            })
            .await
            .unwrap();
        assert_eq!(
            moved.record.locator.mount_id,
            StorageMountId::parse("destination").unwrap()
        );
        assert_eq!(moved.source_cleanup, WorkspaceCleanupStatus::Removed);
        let moved_open = registry.prepare_workspace_open(&record.id).await.unwrap();
        assert_eq!(
            moved_open
                .mounted_storage
                .storage()
                .read(&WorkspaceRelativePath::parse("notes/a.md").unwrap())
                .await
                .unwrap(),
            b"hello"
        );

        registry.remove_workspace(&record.id, true).await.unwrap();
        assert!(registry.get_workspace_record(&record.id).is_none());
    }

    #[tokio::test]
    async fn attach_requires_manifest_unless_explicitly_initialized() {
        let factory = Arc::new(MemoryStorageFactory::new());
        let mut registry = WorkspaceRegistry::with_storage_factory(factory.clone());
        let mount = mount("custom", "Custom");
        registry.register_mount(mount.clone()).await.unwrap();
        let storage = factory.open_mount(&mount).await.unwrap().storage();
        storage
            .create_dir_all(&WorkspaceRelativePath::parse("existing").unwrap())
            .await
            .unwrap();

        let request = AttachWorkspaceRequest {
            mount_id: mount.id,
            workspace_path: WorkspaceRelativePath::parse("existing").unwrap(),
            initialize_if_missing: false,
        };
        assert!(matches!(
            registry.attach_workspace(request.clone()).await,
            Err(WorkspaceError::ManifestNotFound)
        ));

        let attached = registry
            .attach_workspace(AttachWorkspaceRequest {
                initialize_if_missing: true,
                ..request
            })
            .await
            .unwrap();
        assert_eq!(attached.name, "existing");
    }

    #[tokio::test]
    async fn attach_rejects_the_same_workspace_id_at_another_locator() {
        let factory = Arc::new(MemoryStorageFactory::new());
        let mut registry = WorkspaceRegistry::with_storage_factory(factory.clone());
        let source_mount = mount("source", "Source");
        let duplicate_mount = mount("duplicate", "Duplicate");
        registry.register_mount(source_mount.clone()).await.unwrap();
        registry
            .register_mount(duplicate_mount.clone())
            .await
            .unwrap();
        let record = registry
            .create_workspace(CreateWorkspaceRequest {
                name: "alpha".to_string(),
                mount_id: source_mount.id.clone(),
                parent_path: WorkspaceRelativePath::parse("workspaces").unwrap(),
            })
            .await
            .unwrap();

        let source = factory
            .open_mount(&source_mount)
            .await
            .unwrap()
            .into_scoped(WorkspaceRelativePath::parse("workspaces/alpha").unwrap());
        let duplicate_mount_storage = factory.open_mount(&duplicate_mount).await.unwrap();
        duplicate_mount_storage
            .storage()
            .create_dir_all(&WorkspaceRelativePath::parse("imported").unwrap())
            .await
            .unwrap();
        let duplicate =
            duplicate_mount_storage.into_scoped(WorkspaceRelativePath::parse("imported").unwrap());
        copy_storage_tree(source.storage().as_ref(), duplicate.storage().as_ref())
            .await
            .unwrap();

        assert!(matches!(
            registry
                .attach_workspace(AttachWorkspaceRequest {
                    mount_id: duplicate_mount.id,
                    workspace_path: WorkspaceRelativePath::parse("imported").unwrap(),
                    initialize_if_missing: false,
                })
                .await,
            Err(WorkspaceError::AlreadyExistWorkspace(id)) if id == record.id
        ));
    }

    #[tokio::test]
    async fn registry_persist_failure_does_not_commit_memory_or_rename() {
        let factory = Arc::new(MemoryStorageFactory::new());
        let mut registry = WorkspaceRegistry::with_storage_factory(factory.clone());
        let source_mount = mount("source", "Source");
        registry.register_mount(source_mount.clone()).await.unwrap();
        let record = registry
            .create_workspace(CreateWorkspaceRequest {
                name: "alpha".to_string(),
                mount_id: source_mount.id.clone(),
                parent_path: WorkspaceRelativePath::parse("workspaces").unwrap(),
            })
            .await
            .unwrap();

        let failure_path = std::env::temp_dir().join(format!(
            "lonanote-registry-failure-{}",
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir_all(&failure_path).unwrap();
        registry.registry_path = Some(failure_path.clone());

        assert!(registry
            .register_mount(mount("uncommitted", "Uncommitted"))
            .await
            .is_err());
        assert!(!registry
            .mounts
            .contains_key(&StorageMountId::parse("uncommitted").unwrap()));

        assert!(registry
            .rename_workspace(&record.id, "beta".to_string())
            .await
            .is_err());
        assert_eq!(
            registry.get_workspace_record(&record.id).unwrap().name,
            "alpha"
        );
        let storage = factory.storage(&source_mount.id).await.unwrap();
        assert!(storage
            .exists(&WorkspaceRelativePath::parse("workspaces/alpha").unwrap())
            .await
            .unwrap());
        assert!(!storage
            .exists(&WorkspaceRelativePath::parse("workspaces/beta").unwrap())
            .await
            .unwrap());

        std::fs::remove_dir_all(failure_path).unwrap();
    }

    #[tokio::test]
    async fn interrupted_copy_keeps_source_locator_and_cleans_destination() {
        let source_id = StorageMountId::parse("source").unwrap();
        let destination_id = StorageMountId::parse("destination").unwrap();
        let source_inner = Arc::new(MemoryStorage::new());
        let destination_inner = Arc::new(MemoryStorage::new());
        let source_storage: Arc<dyn WorkspaceStorage> = Arc::new(FaultStorage {
            inner: Arc::clone(&source_inner),
            fail_read: Some(
                WorkspaceRelativePath::parse("workspaces/alpha/notes/fail.md").unwrap(),
            ),
            fail_remove: None,
        });
        let mut storages = HashMap::new();
        storages.insert(source_id.clone(), source_storage);
        storages.insert(
            destination_id.clone(),
            destination_inner.clone() as Arc<dyn WorkspaceStorage>,
        );
        let mut registry =
            WorkspaceRegistry::with_storage_factory(Arc::new(FixedStorageFactory { storages }));
        registry
            .register_mount(mount("source", "Source"))
            .await
            .unwrap();
        registry
            .register_mount(mount("destination", "Destination"))
            .await
            .unwrap();
        let record = registry
            .create_workspace(CreateWorkspaceRequest {
                name: "alpha".to_string(),
                mount_id: source_id.clone(),
                parent_path: WorkspaceRelativePath::parse("workspaces").unwrap(),
            })
            .await
            .unwrap();
        source_inner
            .write(
                &WorkspaceRelativePath::parse("workspaces/alpha/notes/fail.md").unwrap(),
                b"fail",
                WriteOptions::default(),
            )
            .await
            .unwrap();

        assert!(registry
            .move_workspace(MoveWorkspaceRequest {
                workspace_id: record.id.clone(),
                destination_mount_id: destination_id,
                destination_parent_path: WorkspaceRelativePath::parse("vaults").unwrap(),
                delete_source_after_commit: true,
            })
            .await
            .is_err());
        assert_eq!(
            registry
                .get_workspace_record(&record.id)
                .unwrap()
                .locator
                .mount_id,
            source_id
        );
        assert!(!destination_inner
            .exists(&WorkspaceRelativePath::parse("vaults/alpha").unwrap())
            .await
            .unwrap());
        let vault_entries = destination_inner
            .list_dir(&WorkspaceRelativePath::parse("vaults").unwrap())
            .await
            .unwrap();
        assert!(vault_entries.is_empty());
    }

    #[tokio::test]
    async fn source_cleanup_failure_is_returned_after_move_commit() {
        let source_id = StorageMountId::parse("source").unwrap();
        let destination_id = StorageMountId::parse("destination").unwrap();
        let source_inner = Arc::new(MemoryStorage::new());
        let destination_inner = Arc::new(MemoryStorage::new());
        let source_storage: Arc<dyn WorkspaceStorage> = Arc::new(FaultStorage {
            inner: Arc::clone(&source_inner),
            fail_read: None,
            fail_remove: Some(WorkspaceRelativePath::parse("workspaces/alpha").unwrap()),
        });
        let mut storages = HashMap::new();
        storages.insert(source_id.clone(), source_storage);
        storages.insert(
            destination_id.clone(),
            destination_inner.clone() as Arc<dyn WorkspaceStorage>,
        );
        let mut registry =
            WorkspaceRegistry::with_storage_factory(Arc::new(FixedStorageFactory { storages }));
        registry
            .register_mount(mount("source", "Source"))
            .await
            .unwrap();
        registry
            .register_mount(mount("destination", "Destination"))
            .await
            .unwrap();
        let record = registry
            .create_workspace(CreateWorkspaceRequest {
                name: "alpha".to_string(),
                mount_id: source_id,
                parent_path: WorkspaceRelativePath::parse("workspaces").unwrap(),
            })
            .await
            .unwrap();

        let moved = registry
            .move_workspace(MoveWorkspaceRequest {
                workspace_id: record.id.clone(),
                destination_mount_id: destination_id.clone(),
                destination_parent_path: WorkspaceRelativePath::parse("vaults").unwrap(),
                delete_source_after_commit: true,
            })
            .await
            .unwrap();
        assert!(matches!(
            moved.source_cleanup,
            WorkspaceCleanupStatus::Failed { .. }
        ));
        assert_eq!(moved.record.locator.mount_id, destination_id);
        assert!(source_inner
            .exists(&WorkspaceRelativePath::parse("workspaces/alpha").unwrap())
            .await
            .unwrap());
        assert!(destination_inner
            .exists(&WorkspaceRelativePath::parse("vaults/alpha").unwrap())
            .await
            .unwrap());
    }

    #[tokio::test]
    async fn remove_record_reports_file_cleanup_failure() {
        let mount_id = StorageMountId::parse("source").unwrap();
        let inner = Arc::new(MemoryStorage::new());
        let storage: Arc<dyn WorkspaceStorage> = Arc::new(FaultStorage {
            inner: Arc::clone(&inner),
            fail_read: None,
            fail_remove: Some(WorkspaceRelativePath::parse("workspaces/alpha").unwrap()),
        });
        let mut storages = HashMap::new();
        storages.insert(mount_id.clone(), storage);
        let mut registry =
            WorkspaceRegistry::with_storage_factory(Arc::new(FixedStorageFactory { storages }));
        registry
            .register_mount(mount("source", "Source"))
            .await
            .unwrap();
        let record = registry
            .create_workspace(CreateWorkspaceRequest {
                name: "alpha".to_string(),
                mount_id,
                parent_path: WorkspaceRelativePath::parse("workspaces").unwrap(),
            })
            .await
            .unwrap();

        let removed = registry.remove_workspace(&record.id, true).await.unwrap();
        assert!(matches!(
            removed.file_cleanup,
            WorkspaceCleanupStatus::Failed { .. }
        ));
        assert!(registry.get_workspace_record(&record.id).is_none());
        assert!(inner
            .exists(&WorkspaceRelativePath::parse("workspaces/alpha").unwrap())
            .await
            .unwrap());
    }
}

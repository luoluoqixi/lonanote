use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use rust_embed::Embed;
use tokio::sync::RwLock;

use crate::config::system_locale::system_locale;
use crate::workspace::{
    domain::{
        AttachWorkspaceResult, OpenWorkspaceResult, RelocateWorkspaceResult, RemoveWorkspaceResult,
        StorageCleanupStatus, StorageProviderId, WorkspaceAvailability, WorkspaceCachedSummary,
        WorkspaceDirectoryName, WorkspaceId, WorkspaceIdMismatchResolution, WorkspaceListItem,
        WorkspaceLocalSetting, WorkspaceManifest, WorkspaceRecord, WorkspaceRelativePath,
        WorkspaceSettings, WorkspaceSnapshot, WorkspaceState, WorkspaceStateStatus,
        WorkspaceStorageBinding, WorkspaceStorageBindingRequest, WorkspaceStorageKindView,
        WorkspaceStorageLocation, WorkspaceStorageTarget, WorkspaceStorageView,
    },
    error::{StorageError, WorkspaceError},
    file_tree::{FileNode, FileTree},
    persistence::{
        WorkspaceCatalog, WorkspaceSessionStore, WORKSPACE_CATALOG_FILE_NAME,
        WORKSPACE_SESSION_FILE_NAME,
    },
    resource::{
        WorkspaceResourceGateway, WorkspaceResourceResponse, WorkspaceResourceScope,
        WorkspaceResourceScopeRequest,
    },
    runtime::{WorkspaceInstance, WorkspaceRuntime},
    storage::{
        copy_workspace_tree, load_local_setting, load_manifest, load_workspace_settings,
        load_workspace_state, save_local_setting, save_manifest, save_workspace_settings,
        save_workspace_state, StorageCapabilities, StorageEntry, StorageEntryMetadata,
        StorageReadOptions, StorageReadStream, WorkspaceStorageResolver, WriteOptions,
    },
};

#[derive(Embed)]
#[folder = "assets/default_workspace/"]
struct DefaultWorkspace;

const WORKSPACE_GITIGNORE_PATH: &str = ".lonanote/.gitignore";
const DEFAULT_GIT_IGNORE: &str = include_str!("../../assets/default_gitignore.txt");
pub const INITIAL_WORKSPACE_DISPLAY_NAME_CN: &str = "我的笔记";
pub const INITIAL_WORKSPACE_DISPLAY_NAME_EN: &str = "My Notes";

mod managed_scan;

pub struct WorkspaceManager {
    catalog: WorkspaceCatalog,
    session: WorkspaceSessionStore,
    runtime: WorkspaceRuntime,
    storage_resolver: Arc<dyn WorkspaceStorageResolver>,
    resource_gateway: WorkspaceResourceGateway,
    lifecycle_lock: RwLock<()>,
    scan_conflicts: RwLock<HashMap<String, managed_scan::PendingScanConflict>>,
}

impl std::fmt::Debug for WorkspaceManager {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("WorkspaceManager")
            .field("catalog", &self.catalog)
            .field("session", &self.session)
            .field("runtime", &self.runtime)
            .finish_non_exhaustive()
    }
}

impl WorkspaceManager {
    pub async fn load(
        data_directory: impl Into<PathBuf>,
        storage_resolver: Arc<dyn WorkspaceStorageResolver>,
    ) -> Result<Self, WorkspaceError> {
        let data_directory = data_directory.into();
        let catalog =
            WorkspaceCatalog::load(data_directory.join(WORKSPACE_CATALOG_FILE_NAME)).await?;
        let session =
            WorkspaceSessionStore::load(data_directory.join(WORKSPACE_SESSION_FILE_NAME)).await?;
        let valid_workspace_ids = catalog
            .list()
            .await
            .into_iter()
            .map(|record| record.id)
            .collect::<HashSet<_>>();
        session.reconcile(&valid_workspace_ids).await?;
        Ok(Self::new(catalog, session, storage_resolver))
    }

    pub fn new(
        catalog: WorkspaceCatalog,
        session: WorkspaceSessionStore,
        storage_resolver: Arc<dyn WorkspaceStorageResolver>,
    ) -> Self {
        Self {
            catalog,
            session,
            runtime: WorkspaceRuntime::new(),
            storage_resolver,
            resource_gateway: WorkspaceResourceGateway::default(),
            lifecycle_lock: RwLock::new(()),
            scan_conflicts: RwLock::new(HashMap::new()),
        }
    }

    pub fn storage_provider_ids(&self) -> Vec<StorageProviderId> {
        self.storage_resolver.provider_ids()
    }

    pub fn managed_storage_provider_ids(&self) -> Vec<StorageProviderId> {
        self.storage_resolver.managed_provider_ids()
    }

    pub async fn list_workspaces(&self) -> Vec<WorkspaceListItem> {
        let _lifecycle = self.lifecycle_lock.read().await;
        let records = self.catalog.list().await;
        let mut items = Vec::with_capacity(records.len());
        for mut record in records {
            let open_instance = self.runtime.get(&record.id).await;
            let is_open = open_instance.is_some();
            if let Some(instance) = open_instance {
                record.cached_summary.modified_at = instance.state_status().await.state.modified_at;
            } else if record.cached_summary.modified_at.is_none() {
                // 缺摘要时读取 State；只有 State 缺失才使用根目录时间，不写工作区文件。
                if let Ok(session) = self.storage_resolver.open(&record.storage_binding).await {
                    if let Ok(Some(timestamp)) = read_modified_at(session.as_ref(), None).await {
                        record.cached_summary.modified_at = match self
                            .catalog
                            .cache_missing_modified_at(&record.id, timestamp)
                            .await
                        {
                            Ok(value) => value,
                            Err(error) => {
                                log::warn!("缓存 Workspace 修改时间失败: {error}");
                                Some(timestamp)
                            }
                        };
                    }
                }
            }
            items.push(WorkspaceListItem {
                id: record.id,
                display_name: record.cached_summary.display_name,
                created_at: record.cached_summary.created_at,
                last_opened_at: record.cached_summary.last_opened_at,
                modified_at: record.cached_summary.modified_at,
                storage: WorkspaceStorageView::from(&record.storage_binding),
                storage_kind: if record.storage_binding.is_managed() {
                    WorkspaceStorageKindView::Managed
                } else {
                    WorkspaceStorageKindView::External
                },
                availability: if is_open {
                    WorkspaceAvailability::Available
                } else {
                    WorkspaceAvailability::Unknown
                },
            });
        }
        items.sort_by(|left, right| left.display_name.cmp(&right.display_name));
        items
    }

    pub async fn get_workspace(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceSnapshot, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        Ok(self.get_open_instance(id).await?.snapshot().await)
    }

    pub async fn is_workspace_open(&self, id: &WorkspaceId) -> bool {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.runtime.contains(id).await
    }

    pub async fn create_managed_workspace(
        &self,
        provider_id: StorageProviderId,
        display_name: String,
    ) -> Result<WorkspaceSnapshot, WorkspaceError> {
        validate_display_name(&display_name)?;
        let _lifecycle = self.lifecycle_lock.write().await;
        self.create_managed_workspace_locked(provider_id, display_name, false)
            .await
    }

    /// 在全新安装时创建一次包含示例内容的默认 Workspace。
    ///
    /// `initial_workspace_copied` 是 Catalog 的单向历史标记；即使用户删除这个
    /// Workspace，后续启动也不会再次创建。
    pub async fn create_initial_workspace_if_needed(
        &self,
        provider_id: StorageProviderId,
    ) -> Result<Option<WorkspaceSnapshot>, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        if self.catalog.initial_workspace_copied().await || !self.catalog.is_empty().await {
            return Ok(None);
        }
        let result = self
            .create_managed_workspace_locked(
                provider_id,
                initial_workspace_display_name(&system_locale()).to_string(),
                true,
            )
            .await
            .map(Some);
        log::info!(
            "initial workspace created: {:?}",
            if let Err(err) = &result {
                err.to_string()
            } else {
                "ok".to_string()
            }
        );
        result
    }

    /// GM 调试用途：删除首次自动创建的 Workspace，并允许再次触发首次启动复制。
    ///
    /// 新 Catalog 通过 `initial_workspace_id` 精确定位首次 Workspace。旧 Catalog 没有
    /// 该字段时，只有当前恰好存在一个 Workspace 才会将其视为首次 Workspace，避免
    /// 在存在多个 Workspace 时误删用户数据。
    pub async fn gm_reset_initial_workspace(
        &self,
    ) -> Result<Option<RemoveWorkspaceResult>, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        let catalog = self.catalog.snapshot().await;
        let initial_workspace_id = catalog.initial_workspace_id.or_else(|| {
            (catalog.initial_workspace_copied && catalog.workspaces.len() == 1).then(|| {
                *catalog
                    .workspaces
                    .keys()
                    .next()
                    .expect("已检查唯一 Workspace")
            })
        });
        if let Some(workspace_id) = initial_workspace_id {
            self.runtime.remove(&workspace_id).await;
            self.resource_gateway.revoke_workspace(&workspace_id).await;
            self.session.remove(&workspace_id).await?;
        }
        let removed_record = self
            .catalog
            .reset_initial_workspace(initial_workspace_id)
            .await?;
        let Some(removed_record) = removed_record else {
            return Ok(None);
        };
        let storage = WorkspaceStorageView::from(&removed_record.storage_binding);
        let file_cleanup = match self
            .storage_resolver
            .remove_workspace_root(&removed_record.storage_binding)
            .await
        {
            Ok(()) => StorageCleanupStatus::Removed,
            Err(error) => StorageCleanupStatus::Failed {
                message: error.to_string(),
            },
        };
        Ok(Some(RemoveWorkspaceResult {
            workspace_id: removed_record.id,
            storage,
            file_cleanup,
        }))
    }

    async fn create_managed_workspace_locked(
        &self,
        provider_id: StorageProviderId,
        display_name: String,
        include_default_workspace: bool,
    ) -> Result<WorkspaceSnapshot, WorkspaceError> {
        let base_name = WorkspaceDirectoryName::from_display_name(&display_name);
        let mut suffix = 1usize;
        let (binding, session) = loop {
            let directory_name = if suffix == 1 {
                base_name.clone()
            } else {
                base_name.with_suffix(suffix)
            };
            match self
                .storage_resolver
                .create_managed(&provider_id, &directory_name)
                .await
            {
                Ok(result) => break result,
                Err(StorageError::AlreadyExists { .. }) => suffix += 1,
                Err(error) => return Err(error.into()),
            }
        };
        let manifest = WorkspaceManifest::new(WorkspaceId::new(), display_name, now_timestamp());
        if let Err(error) =
            initialize_workspace(session.as_ref(), &manifest, include_default_workspace).await
        {
            let _ = self.storage_resolver.remove_workspace_root(&binding).await;
            return Err(error);
        }
        let record = record_from_manifest(binding.clone(), &manifest, now_timestamp());
        let catalog_result = if include_default_workspace {
            self.catalog.add_initial_workspace(record).await
        } else {
            self.catalog.add(record).await
        };
        if let Err(error) = catalog_result {
            let _ = self.storage_resolver.remove_workspace_root(&binding).await;
            return Err(error);
        }
        self.open_workspace_locked(&manifest.id).await
    }

    pub async fn create_external_workspace(
        &self,
        request: WorkspaceStorageBindingRequest,
        display_name: String,
    ) -> Result<WorkspaceSnapshot, WorkspaceError> {
        validate_display_name(&display_name)?;
        if request.is_managed() {
            return Err(WorkspaceError::ExpectedExternalBinding);
        }
        let _lifecycle = self.lifecycle_lock.write().await;
        let binding = self.resolve_binding(request).await?;
        let session = self.storage_resolver.open(&binding).await?;
        if manifest_exists(session.as_ref()).await? {
            return Err(WorkspaceError::ManifestAlreadyExists);
        }
        let manifest = WorkspaceManifest::new(WorkspaceId::new(), display_name, now_timestamp());
        initialize_workspace(session.as_ref(), &manifest, false).await?;
        let record = record_from_manifest(binding, &manifest, now_timestamp());
        self.catalog.add(record).await?;
        self.open_workspace_locked(&manifest.id).await
    }

    pub async fn attach_workspace(
        &self,
        request: WorkspaceStorageBindingRequest,
    ) -> Result<AttachWorkspaceResult, WorkspaceError> {
        if request.is_managed() {
            return Err(WorkspaceError::ExpectedExternalBinding);
        }
        let _lifecycle = self.lifecycle_lock.write().await;
        let binding = self.resolve_binding(request).await?;
        let session = self.storage_resolver.open(&binding).await?;
        let manifest = load_manifest(session.as_ref())
            .await?
            .ok_or(WorkspaceError::ManifestNotFound)?;
        load_workspace_settings(session.as_ref()).await?;
        let mut record = record_from_manifest(binding.clone(), &manifest, now_timestamp());
        let existing_modified_at = self
            .catalog
            .get(&manifest.id)
            .await
            .ok()
            .filter(|record| record.storage_binding.same_resource(&binding))
            .and_then(|record| record.cached_summary.modified_at);
        record.cached_summary.modified_at =
            read_modified_at(session.as_ref(), existing_modified_at).await?;
        let record = self.catalog.add_or_validate_same_binding(record).await?;
        Ok(AttachWorkspaceResult::from(&record))
    }

    pub async fn open_workspace(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceSnapshot, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        self.open_workspace_locked(id).await
    }

    pub async fn open_workspace_with_diagnostics(
        &self,
        id: &WorkspaceId,
    ) -> Result<OpenWorkspaceResult, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        match self.open_workspace_locked(id).await {
            Ok(workspace) => Ok(OpenWorkspaceResult::Opened {
                workspace: Box::new(workspace),
            }),
            Err(WorkspaceError::Storage(StorageError::NotFound { path })) if path.is_root() => {
                Ok(OpenWorkspaceResult::DirectoryMissing { workspace_id: *id })
            }
            Err(WorkspaceError::WorkspaceIdMismatch { expected, actual }) => {
                let manifest_id_registered = self.catalog.get(&actual).await.is_ok();
                Ok(OpenWorkspaceResult::IdMismatch {
                    expected_id: expected,
                    actual_id: actual,
                    manifest_id_registered,
                })
            }
            Err(error) => Err(error),
        }
    }

    pub async fn resolve_workspace_id_mismatch(
        &self,
        id: &WorkspaceId,
        resolution: WorkspaceIdMismatchResolution,
    ) -> Result<WorkspaceSnapshot, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        if self.runtime.contains(id).await {
            return Err(WorkspaceError::CannotModifyOpenWorkspace(*id));
        }
        let record = self.catalog.get(id).await?;
        let session = self.storage_resolver.open(&record.storage_binding).await?;
        let mut manifest = load_manifest(session.as_ref())
            .await?
            .ok_or(WorkspaceError::ManifestNotFound)?;
        load_workspace_settings(session.as_ref()).await?;
        load_local_setting(session.as_ref()).await?;
        load_workspace_state(session.as_ref()).await?;
        if manifest.id == *id {
            return self.open_workspace_locked(id).await;
        }

        let replacement_id = match resolution {
            WorkspaceIdMismatchResolution::UseManifestId => manifest.id,
            WorkspaceIdMismatchResolution::GenerateNewId => {
                let generated_id = loop {
                    let candidate = WorkspaceId::new();
                    match self.catalog.get(&candidate).await {
                        Ok(_) => continue,
                        Err(WorkspaceError::NotFoundWorkspace(_)) => break candidate,
                        Err(error) => return Err(error),
                    }
                };
                manifest.id = generated_id;
                // 先写 Manifest：若后续 Catalog 持久化失败，仍可再次通过 ID 不匹配流程恢复。
                save_manifest(session.as_ref(), &manifest).await?;
                generated_id
            }
        };
        let replacement = WorkspaceRecord {
            id: replacement_id,
            storage_binding: record.storage_binding,
            cached_summary: summary_from_manifest(
                &manifest,
                now_timestamp(),
                record.cached_summary.last_opened_at,
                record.cached_summary.modified_at,
            ),
        };
        self.catalog.replace_workspace_id(id, replacement).await?;
        self.session
            .replace_workspace_id(id, replacement_id)
            .await?;
        self.resource_gateway.revoke_workspace(id).await;
        self.open_workspace_locked(&replacement_id).await
    }

    pub async fn close_workspace(&self, id: &WorkspaceId) -> Result<(), WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        if let Some(workspace) = self.runtime.get(id).await {
            workspace.flush_state().await?;
            self.cache_modification(id).await;
        }
        self.runtime.remove(id).await;
        self.resource_gateway.revoke_workspace(id).await;
        Ok(())
    }

    pub async fn remove_workspace(
        &self,
        id: &WorkspaceId,
        delete_files: bool,
    ) -> Result<RemoveWorkspaceResult, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        if self.runtime.contains(id).await {
            return Err(WorkspaceError::CannotModifyOpenWorkspace(*id));
        }
        self.session.remove(id).await?;
        let removed_record = self.catalog.remove(id).await?;
        let removed_storage = WorkspaceStorageView::from(&removed_record.storage_binding);
        let file_cleanup = if delete_files {
            match self
                .storage_resolver
                .remove_workspace_root(&removed_record.storage_binding)
                .await
            {
                Ok(()) => StorageCleanupStatus::Removed,
                Err(error) => StorageCleanupStatus::Failed {
                    message: error.to_string(),
                },
            }
        } else {
            StorageCleanupStatus::Retained
        };
        Ok(RemoveWorkspaceResult {
            workspace_id: removed_record.id,
            storage: removed_storage,
            file_cleanup,
        })
    }

    pub async fn relocate_workspace(
        &self,
        id: &WorkspaceId,
        target: WorkspaceStorageTarget,
    ) -> Result<RelocateWorkspaceResult, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        if self.runtime.contains(id).await {
            return Err(WorkspaceError::CannotModifyOpenWorkspace(*id));
        }
        let source_record = self.catalog.get(id).await?;
        let source_session = self
            .storage_resolver
            .open(&source_record.storage_binding)
            .await?;
        let (target_binding, target_session) = match target {
            WorkspaceStorageTarget::Managed {
                provider_id,
                preferred_directory_name,
            } => {
                if source_record.storage_binding.provider_id == provider_id
                    && matches!(
                        &source_record.storage_binding.location,
                        WorkspaceStorageLocation::Managed { directory_name }
                            if directory_name == &preferred_directory_name
                    )
                {
                    return Err(WorkspaceError::SameStorageBinding);
                }
                let (binding, session) = self
                    .storage_resolver
                    .create_managed(&provider_id, &preferred_directory_name)
                    .await?;
                (binding, session)
            }
            WorkspaceStorageTarget::External { binding: request } => {
                if request.is_managed() {
                    return Err(WorkspaceError::ExpectedExternalBinding);
                }
                let binding = self.resolve_binding(request).await?;
                if binding.same_resource(&source_record.storage_binding) {
                    return Err(WorkspaceError::SameStorageBinding);
                }
                let session = self.storage_resolver.open(&binding).await?;
                if !session
                    .list_dir(&WorkspaceRelativePath::root())
                    .await?
                    .is_empty()
                {
                    return Err(WorkspaceError::TargetNotEmpty);
                }
                (binding, session)
            }
        };
        copy_workspace_tree(source_session.as_ref(), target_session.as_ref()).await?;
        let target_manifest = load_manifest(target_session.as_ref())
            .await?
            .ok_or(WorkspaceError::ManifestNotFound)?;
        if target_manifest.id != *id {
            return Err(WorkspaceError::WorkspaceIdMismatch {
                expected: *id,
                actual: target_manifest.id,
            });
        }
        load_workspace_settings(target_session.as_ref()).await?;
        load_workspace_state(target_session.as_ref()).await?;
        self.catalog
            .update_binding(id, target_binding.clone())
            .await?;
        Ok(RelocateWorkspaceResult {
            workspace_id: *id,
            source_storage: WorkspaceStorageView::from(&source_record.storage_binding),
            target_storage: WorkspaceStorageView::from(&target_binding),
            source_cleanup: StorageCleanupStatus::Retained,
        })
    }

    pub async fn update_display_name(
        &self,
        id: &WorkspaceId,
        display_name: String,
    ) -> Result<WorkspaceSnapshot, WorkspaceError> {
        validate_display_name(&display_name)?;
        let _lifecycle = self.lifecycle_lock.write().await;
        let workspace = self.get_open_instance(id).await?;
        let manifest = workspace.update_display_name(display_name).await?;
        let previous_summary = self.catalog.get(id).await?.cached_summary;
        let state = workspace.state_status().await;
        self.catalog
            .update_summary(
                id,
                summary_from_manifest(
                    &manifest,
                    now_timestamp(),
                    previous_summary.last_opened_at,
                    if state.save_pending {
                        previous_summary.modified_at
                    } else {
                        state.state.modified_at
                    },
                ),
            )
            .await?;
        Ok(workspace.snapshot().await)
    }

    pub async fn get_settings(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        Ok(self.get_open_instance(id).await?.settings().await)
    }

    pub async fn set_settings(
        &self,
        id: &WorkspaceId,
        settings: WorkspaceSettings,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        let workspace = self.get_open_instance(id).await?;
        let settings = workspace.set_settings(settings).await?;
        self.cache_modification(id).await;
        Ok(settings)
    }

    pub async fn reset_settings(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        self.set_settings(id, WorkspaceSettings::default()).await
    }

    pub async fn get_last_workspace_id(&self) -> Option<WorkspaceId> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.session.last_workspace_id().await
    }

    pub async fn get_local_setting(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceLocalSetting, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        Ok(self.get_open_instance(id).await?.local_setting().await)
    }

    pub async fn get_state(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceStateStatus, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        Ok(self.get_open_instance(id).await?.state_status().await)
    }

    pub async fn reload_state(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceStateStatus, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.reload_state().await?;
        self.cache_modification(id).await;
        Ok(self.get_open_instance(id).await?.state_status().await)
    }

    pub async fn flush_state(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceStateStatus, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.flush_state().await?;
        self.cache_modification(id).await;
        Ok(self.get_open_instance(id).await?.state_status().await)
    }

    pub async fn set_last_open_file(
        &self,
        id: &WorkspaceId,
        path: Option<WorkspaceRelativePath>,
    ) -> Result<WorkspaceLocalSetting, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id)
            .await?
            .set_last_open_file(path)
            .await
    }

    pub async fn capabilities(
        &self,
        id: &WorkspaceId,
    ) -> Result<StorageCapabilities, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.capabilities().await
    }

    pub async fn file_exists(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
    ) -> Result<bool, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.exists(path).await
    }

    pub async fn file_metadata(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.metadata(path).await
    }

    pub async fn list_directory(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.list_directory(path).await
    }

    pub async fn read_bytes(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<u8>, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.read_bytes(path).await
    }

    /// 为 Editor 资源 URL 申请可撤销的 opaque scope，不通过普通 command 暴露。
    pub async fn acquire_resource_scope(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceResourceScope, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        let workspace = self.get_open_instance(id).await?;
        Ok(self
            .resource_gateway
            .acquire_scope(*id, workspace.storage_session())
            .await)
    }

    /// 为 Native resource adapter 打开资源；调用方必须持有 scope URL 的 capability。
    pub async fn open_resource(
        &self,
        request: WorkspaceResourceScopeRequest,
    ) -> WorkspaceResourceResponse {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.resource_gateway.open(request).await
    }

    /// 为资源 Gateway 打开只读字节流；不作为普通 command 暴露给 TypeScript。
    pub async fn open_read(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
        options: StorageReadOptions,
    ) -> Result<StorageReadStream, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id)
            .await?
            .open_read(path, options)
            .await
    }

    pub async fn read_text(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
    ) -> Result<String, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.read_text(path).await
    }

    pub async fn write_bytes(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
        data: &[u8],
        options: WriteOptions,
    ) -> Result<(), WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id)
            .await?
            .write_bytes(path, data, options)
            .await?;
        self.resource_gateway.invalidate_workspace(id).await;
        self.cache_modification(id).await;
        Ok(())
    }

    pub async fn write_text(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
        text: &str,
        options: WriteOptions,
    ) -> Result<(), WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id)
            .await?
            .write_text(path, text, options)
            .await?;
        self.resource_gateway.invalidate_workspace(id).await;
        self.cache_modification(id).await;
        Ok(())
    }

    pub async fn create_directory(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
    ) -> Result<(), WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id)
            .await?
            .create_directory(path)
            .await?;
        self.resource_gateway.invalidate_workspace(id).await;
        self.cache_modification(id).await;
        Ok(())
    }

    pub async fn rename(
        &self,
        id: &WorkspaceId,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.rename(from, to).await?;
        self.resource_gateway.invalidate_workspace(id).await;
        self.cache_modification(id).await;
        Ok(())
    }

    pub async fn remove(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id)
            .await?
            .remove(path, recursive)
            .await?;
        self.resource_gateway.invalidate_workspace(id).await;
        self.cache_modification(id).await;
        Ok(())
    }

    pub async fn get_tree(
        &self,
        id: &WorkspaceId,
        recursive: bool,
    ) -> Result<FileTree, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.get_tree(recursive).await
    }

    pub async fn get_node(
        &self,
        id: &WorkspaceId,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<FileNode, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id)
            .await?
            .get_node(path, recursive)
            .await
    }

    pub async fn refresh_index(&self, id: &WorkspaceId) -> Result<(), WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.refresh_index().await
    }

    async fn cache_modification(&self, id: &WorkspaceId) {
        let Ok(workspace) = self.get_open_instance(id).await else {
            return;
        };
        let _mutation = workspace.lock_mutation().await;
        let status = workspace.state_status().await;
        // 待写状态不发布到持久摘要；内容保存成功不能因缓存失败向编辑器报告失败。
        if status.save_pending {
            return;
        }
        if let Err(error) = self
            .catalog
            .project_modified_at(id, status.state.modified_at)
            .await
        {
            log::warn!("缓存 Workspace 修改时间失败: {error}");
        }
    }

    async fn get_open_instance(
        &self,
        id: &WorkspaceId,
    ) -> Result<Arc<WorkspaceInstance>, WorkspaceError> {
        self.runtime
            .get(id)
            .await
            .ok_or(WorkspaceError::NotOpen(*id))
    }

    async fn resolve_binding(
        &self,
        request: WorkspaceStorageBindingRequest,
    ) -> Result<WorkspaceStorageBinding, WorkspaceError> {
        let identity = self.storage_resolver.resolve_identity(&request).await?;
        Ok(request.resolve(identity))
    }

    async fn open_workspace_locked(
        &self,
        id: &WorkspaceId,
    ) -> Result<WorkspaceSnapshot, WorkspaceError> {
        if let Some(workspace) = self.runtime.get(id).await {
            workspace.reload_state().await?;
            self.cache_modification(id).await;
            return Ok(workspace.snapshot().await);
        }
        let record = self.catalog.get(id).await?;
        let session = self.storage_resolver.open(&record.storage_binding).await?;
        let manifest = load_manifest(session.as_ref())
            .await?
            .ok_or(WorkspaceError::ManifestNotFound)?;
        if manifest.id != *id {
            return Err(WorkspaceError::WorkspaceIdMismatch {
                expected: *id,
                actual: manifest.id,
            });
        }
        let settings = load_workspace_settings(session.as_ref()).await?;
        let local_setting = load_local_setting(session.as_ref()).await?;
        // 已存在的 State（包括 null）是权威；缺文件才初始化，打开本身不算修改。
        let state = match load_workspace_state(session.as_ref()).await? {
            Some(state) => state,
            None => {
                let state = WorkspaceState {
                    modified_at: match record.cached_summary.modified_at {
                        Some(timestamp) => Some(timestamp),
                        None => folder_modified_at(session.as_ref()).await,
                    },
                    ..WorkspaceState::default()
                };
                save_workspace_state(session.as_ref(), &state).await?;
                state
            }
        };
        let modified_at = state.modified_at;
        let workspace = Arc::new(
            WorkspaceInstance::new(
                record.storage_binding,
                session,
                manifest.clone(),
                settings,
                local_setting,
                state,
            )
            .await?,
        );
        self.runtime.insert(*id, Arc::clone(&workspace)).await?;
        let now = now_timestamp();
        if let Err(error) = workspace.mark_opened(now).await {
            self.runtime.remove(id).await;
            return Err(error);
        }
        if let Err(error) = self
            .catalog
            .update_summary(
                id,
                summary_from_manifest(&manifest, now, Some(now), modified_at),
            )
            .await
        {
            self.runtime.remove(id).await;
            return Err(error);
        }
        if let Err(error) = self.session.mark_opened(*id).await {
            self.runtime.remove(id).await;
            return Err(error);
        }
        Ok(workspace.snapshot().await)
    }
}

/// 根据平台传入的 BCP 47 locale 选择首次默认 Workspace 名称。
///
/// 仅中文（`zh`、`zh-CN`、`zh_Hant` 等）使用中文名称；无法识别或其他语言一律
/// 使用英文名称，确保首次启动始终能创建有效的 Workspace。
fn initial_workspace_display_name(system_locale: &str) -> &'static str {
    let language = system_locale
        .trim()
        .split(['-', '_'])
        .next()
        .unwrap_or_default();
    if language.eq_ignore_ascii_case("zh") {
        INITIAL_WORKSPACE_DISPLAY_NAME_CN
    } else {
        INITIAL_WORKSPACE_DISPLAY_NAME_EN
    }
}

async fn initialize_workspace(
    session: &super::storage::WorkspaceStorageSession,
    manifest: &WorkspaceManifest,
    include_default_workspace: bool,
) -> Result<(), WorkspaceError> {
    save_workspace_settings(session, &WorkspaceSettings::default()).await?;
    save_local_setting(session, &WorkspaceLocalSetting::default()).await?;
    let gitignore_path = WorkspaceRelativePath::parse(WORKSPACE_GITIGNORE_PATH)?;
    if !session.exists(&gitignore_path).await? {
        session
            .write(
                &gitignore_path,
                DEFAULT_GIT_IGNORE.as_bytes(),
                WriteOptions {
                    overwrite: false,
                    create_parent: true,
                    atomic: false,
                },
            )
            .await?;
    }
    if include_default_workspace {
        for asset_path in DefaultWorkspace::iter() {
            let path = WorkspaceRelativePath::parse(asset_path.as_ref().replace('\\', "/"))?;
            if session.exists(&path).await? {
                continue;
            }
            if let Some(asset) = DefaultWorkspace::get(asset_path.as_ref()) {
                session
                    .write(
                        &path,
                        asset.data.as_ref(),
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
    // Manifest 是 Workspace 初始化完成的提交标记，必须最后写入。
    save_workspace_state(
        session,
        &WorkspaceState {
            modified_at: Some(manifest.created_at),
            ..WorkspaceState::default()
        },
    )
    .await?;
    save_manifest(session, manifest).await?;
    Ok(())
}

async fn manifest_exists(
    session: &super::storage::WorkspaceStorageSession,
) -> Result<bool, WorkspaceError> {
    let path = WorkspaceRelativePath::parse(super::domain::WORKSPACE_MANIFEST_PATH)?;
    Ok(session.exists(&path).await?)
}

fn record_from_manifest(
    storage_binding: WorkspaceStorageBinding,
    manifest: &WorkspaceManifest,
    validated_at: u64,
) -> WorkspaceRecord {
    WorkspaceRecord {
        id: manifest.id,
        storage_binding,
        cached_summary: summary_from_manifest(manifest, validated_at, None, None),
    }
}

fn summary_from_manifest(
    manifest: &WorkspaceManifest,
    validated_at: u64,
    last_opened_at: Option<u64>,
    modified_at: Option<u64>,
) -> WorkspaceCachedSummary {
    WorkspaceCachedSummary {
        display_name: manifest.display_name.clone(),
        created_at: Some(manifest.created_at),
        last_opened_at,
        modified_at,
        last_validated_at: Some(validated_at),
    }
}

async fn folder_modified_at(session: &super::storage::WorkspaceStorageSession) -> Option<u64> {
    session
        .metadata(&WorkspaceRelativePath::root())
        .await
        .ok()
        .and_then(|metadata| metadata.modified_at)
}

async fn read_modified_at(
    session: &super::storage::WorkspaceStorageSession,
    cached: Option<u64>,
) -> Result<Option<u64>, WorkspaceError> {
    Ok(match load_workspace_state(session).await? {
        Some(state) => state.modified_at,
        None => match cached {
            Some(timestamp) => Some(timestamp),
            None => folder_modified_at(session).await,
        },
    })
}

fn validate_display_name(display_name: &str) -> Result<(), WorkspaceError> {
    if display_name.trim().is_empty() || display_name.chars().any(char::is_control) {
        return Err(WorkspaceError::InvalidDisplayName);
    }
    Ok(())
}

fn now_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::{
        initial_workspace_display_name, INITIAL_WORKSPACE_DISPLAY_NAME_CN,
        INITIAL_WORKSPACE_DISPLAY_NAME_EN,
    };

    #[test]
    fn initial_workspace_display_name_uses_chinese_only_for_zh_locales() {
        for locale in ["zh", "zh-CN", "ZH_hant"] {
            assert_eq!(
                initial_workspace_display_name(locale),
                INITIAL_WORKSPACE_DISPLAY_NAME_CN
            );
        }
        for locale in ["", "en-US", "ja-JP", "yue-Hant"] {
            assert_eq!(
                initial_workspace_display_name(locale),
                INITIAL_WORKSPACE_DISPLAY_NAME_EN
            );
        }
    }
}

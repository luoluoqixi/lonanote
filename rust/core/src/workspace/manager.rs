use std::{
    collections::HashSet,
    path::PathBuf,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use rust_embed::Embed;
use tokio::sync::RwLock;

use crate::config::system_locale::system_locale;
use crate::workspace::{
    domain::{
        AttachWorkspaceResult, RelocateWorkspaceResult, RemoveWorkspaceResult,
        StorageCleanupStatus, StorageProviderId, WorkspaceAvailability, WorkspaceCachedSummary,
        WorkspaceDirectoryName, WorkspaceId, WorkspaceListItem, WorkspaceLocalSetting,
        WorkspaceManifest, WorkspaceRecord, WorkspaceRelativePath, WorkspaceSettings,
        WorkspaceSnapshot, WorkspaceStorageBinding, WorkspaceStorageBindingRequest,
        WorkspaceStorageKindView, WorkspaceStorageLocation, WorkspaceStorageTarget,
        WorkspaceStorageView,
    },
    error::{StorageError, WorkspaceError},
    file_tree::{FileNode, FileTree},
    persistence::{
        WorkspaceCatalog, WorkspaceSessionStore, WORKSPACE_CATALOG_FILE_NAME,
        WORKSPACE_SESSION_FILE_NAME,
    },
    runtime::{WorkspaceInstance, WorkspaceRuntime},
    storage::{
        copy_workspace_tree, load_local_setting, load_manifest, load_workspace_settings,
        save_local_setting, save_manifest, save_workspace_settings, StorageCapabilities,
        StorageEntry, StorageEntryMetadata, WorkspaceStorageResolver, WriteOptions,
    },
};

#[derive(Embed)]
#[folder = "assets/default_workspace/"]
struct DefaultWorkspace;

const WORKSPACE_GITIGNORE_PATH: &str = ".lonanote/.gitignore";
const DEFAULT_GIT_IGNORE: &str = include_str!("../../assets/default_gitignore.txt");
pub const INITIAL_WORKSPACE_DISPLAY_NAME_CN: &str = "我的笔记";
pub const INITIAL_WORKSPACE_DISPLAY_NAME_EN: &str = "My Notes";

pub struct WorkspaceManager {
    catalog: WorkspaceCatalog,
    session: WorkspaceSessionStore,
    runtime: WorkspaceRuntime,
    storage_resolver: Arc<dyn WorkspaceStorageResolver>,
    lifecycle_lock: RwLock<()>,
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
            lifecycle_lock: RwLock::new(()),
        }
    }

    pub fn storage_provider_ids(&self) -> Vec<StorageProviderId> {
        self.storage_resolver.provider_ids()
    }

    pub async fn list_workspaces(&self) -> Vec<WorkspaceListItem> {
        let _lifecycle = self.lifecycle_lock.read().await;
        let records = self.catalog.list().await;
        let mut items = Vec::with_capacity(records.len());
        for record in records {
            let is_open = self.runtime.contains(&record.id).await;
            items.push(WorkspaceListItem {
                id: record.id,
                display_name: record.cached_summary.display_name,
                created_at: record.cached_summary.created_at,
                last_opened_at: record.cached_summary.last_opened_at,
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
        let record = record_from_manifest(binding, &manifest, now_timestamp());
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

    pub async fn close_workspace(&self, id: &WorkspaceId) -> Result<(), WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        self.runtime.remove(id).await;
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
        self.catalog
            .update_summary(
                id,
                summary_from_manifest(&manifest, now_timestamp(), previous_summary.last_opened_at),
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
        workspace.set_settings(settings).await
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
            .await
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
            .await
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
            .await
    }

    pub async fn rename(
        &self,
        id: &WorkspaceId,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id).await?.rename(from, to).await
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
            .await
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
        let workspace = Arc::new(
            WorkspaceInstance::new(
                record.storage_binding,
                session,
                manifest.clone(),
                settings,
                local_setting,
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
            .update_summary(id, summary_from_manifest(&manifest, now, Some(now)))
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
        cached_summary: summary_from_manifest(manifest, validated_at, None),
    }
}

fn summary_from_manifest(
    manifest: &WorkspaceManifest,
    validated_at: u64,
    last_opened_at: Option<u64>,
) -> WorkspaceCachedSummary {
    WorkspaceCachedSummary {
        display_name: manifest.display_name.clone(),
        created_at: Some(manifest.created_at),
        last_opened_at,
        last_validated_at: Some(validated_at),
    }
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

use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use tokio::sync::{Mutex, MutexGuard, RwLock};

use crate::workspace::{
    domain::{
        WorkspaceId, WorkspaceLocalSetting, WorkspaceManifest, WorkspaceRelativePath,
        WorkspaceRuntimeStatus, WorkspaceSettings, WorkspaceSnapshot, WorkspaceState,
        WorkspaceStateStatus, WorkspaceStorageBinding, WorkspaceStorageView,
    },
    error::{StorageError, WorkspaceError},
    storage::{
        load_workspace_state, save_local_setting, save_manifest, save_workspace_settings,
        save_workspace_state, validate_local_setting, validate_workspace_settings,
        validate_workspace_state, StorageCapabilities, StorageEntry, StorageEntryMetadata,
        StorageReadOptions, StorageReadStream, WorkspaceStorageSession, WriteOptions,
    },
    WorkspaceDirectorySnapshot,
};

use super::index::WorkspaceIndex;
use crate::workspace::{
    StorageEntryKind, TransferConflictPolicy, TransferEntryResult, TransferOperation,
    TransferSource, TransferStatus,
};

#[derive(Debug)]
pub struct WorkspaceInstance {
    pub id: WorkspaceId,
    pub storage_binding: WorkspaceStorageBinding,
    session: Arc<WorkspaceStorageSession>,
    manifest: RwLock<WorkspaceManifest>,
    settings: RwLock<WorkspaceSettings>,
    local_setting: RwLock<WorkspaceLocalSetting>,
    state: RwLock<WorkspaceStateStatus>,
    mutation_lock: Mutex<()>,
    index: WorkspaceIndex,
}

impl WorkspaceInstance {
    pub async fn transfer_entries(
        &self,
        sources: Vec<TransferSource>,
        destination: WorkspaceRelativePath,
        operation: TransferOperation,
        conflict_policy: TransferConflictPolicy,
        protected_paths: Vec<WorkspaceRelativePath>,
    ) -> Result<Vec<TransferEntryResult>, WorkspaceError> {
        ensure_user_mutation_path(&destination)?;
        let _mutation = self.mutation_lock.lock().await;
        if self.session.metadata(&destination).await?.kind != StorageEntryKind::Directory {
            return Err(StorageError::NotDirectory { path: destination }.into());
        }
        let capabilities = self.session.capabilities().await?;
        if !capabilities.can_write
            || !capabilities.can_read
            || (operation == TransferOperation::Move
                && (!capabilities.can_move_entry || !capabilities.can_delete))
            || (operation == TransferOperation::Copy && !capabilities.can_copy_entry)
        {
            return Err(StorageError::UnsupportedOperation {
                operation: "safe_transfer",
            }
            .into());
        }
        let mut sources = sources;
        sources.sort_by(|a, b| a.path.cmp(&b.path));
        sources.dedup_by(|a, b| a.path == b.path);
        let all = sources.clone();
        sources.retain(|s| {
            !all.iter()
                .any(|parent| parent.path != s.path && s.path.starts_with(&parent.path))
        });
        let mut result = Vec::new();
        let mut committed_targets = Vec::new();
        for source in &sources {
            let mut cleanup_error = None;
            let attempt: Result<(TransferStatus, Option<WorkspaceRelativePath>), WorkspaceError> =
                async {
                    ensure_user_mutation_path(&source.path)?;
                    if source.path.is_root() {
                        return Err(StorageError::CannotModifyRoot.into());
                    }
                    let metadata = self.session.metadata(&source.path).await?;
                    if source.expected_metadata.as_ref().is_some_and(|expected| {
                        expected.identity.is_none() || expected.identity != metadata.identity
                    }) {
                        return Err(StorageError::UnsupportedOperation {
                            operation: "transfer_source_changed",
                        }
                        .into());
                    }
                    if sources.iter().any(|s| destination.starts_with(&s.path)) {
                        return Err(StorageError::UnsupportedOperation {
                            operation: "transfer_into_source",
                        }
                        .into());
                    }
                    let name = source
                        .path
                        .file_name()
                        .ok_or(StorageError::CannotModifyRoot)?;
                    let mut target = destination.join_name(&name);
                    ensure_user_mutation_path(&target)?;
                    // 同目录操作统一生成副本，保留来源，避免把自身当作重名覆盖目标。
                    let same_directory = target == source.path;
                    let operation = if same_directory {
                        TransferOperation::Copy
                    } else {
                        operation
                    };
                    let conflict_policy = if same_directory {
                        TransferConflictPolicy::KeepBoth
                    } else {
                        conflict_policy
                    };
                    if operation == TransferOperation::Copy && !capabilities.can_copy_entry {
                        return Err(StorageError::UnsupportedOperation {
                            operation: "safe_copy",
                        }
                        .into());
                    }
                    let protected = |target: &WorkspaceRelativePath| {
                        protected_paths
                            .iter()
                            .chain(committed_targets.iter())
                            .any(|p| p == target || p.starts_with(target))
                    };
                    if self.session.exists(&target).await? || protected(&target) {
                        match conflict_policy {
                            TransferConflictPolicy::Overwrite => {
                                if target == source.path {
                                    return Ok((TransferStatus::Skipped, Some(target)));
                                }
                                // 覆盖不能触碰任一来源或打开的目标文档，目录整体替换而非合并。
                                if protected(&target) {
                                    return Err(StorageError::io(
                                        "overwrite_open_target",
                                        "目标路径有已打开的文档，请先关闭后重试",
                                    )
                                    .into());
                                }
                                if sources.iter().any(|s| {
                                    s.path.starts_with(&target) || target.starts_with(&s.path)
                                }) {
                                    return Err(StorageError::io(
                                        "overwrite_source_overlap",
                                        "目标与批量来源重叠，不能覆盖",
                                    )
                                    .into());
                                }
                                if !capabilities.can_move_entry || !capabilities.can_delete {
                                    return Err(StorageError::UnsupportedOperation {
                                        operation: "safe_overwrite",
                                    }
                                    .into());
                                }
                                let mut overwrite_protected = protected_paths.clone();
                                overwrite_protected.extend(sources.iter().map(|s| s.path.clone()));
                                overwrite_protected.extend(committed_targets.iter().cloned());
                                self.session
                                    .validate_overwrite(&target, &overwrite_protected)
                                    .await?;
                                cleanup_error = super::transfer_replace::replace_entry(
                                    &self.session,
                                    &source.path,
                                    &target,
                                    operation,
                                )
                                .await?;
                                self.index
                                    .invalidate_paths(&[source.path.clone(), target.clone()])
                                    .await;
                                self.mark_modified_locked().await;
                                return Ok((TransferStatus::Succeeded, Some(target)));
                            }
                            TransferConflictPolicy::Skip => {
                                return Ok((TransferStatus::Skipped, Some(target)))
                            }
                            TransferConflictPolicy::Error => {
                                return Err(StorageError::AlreadyExists { path: target }.into())
                            }
                            TransferConflictPolicy::KeepBoth => {
                                let value = name.as_str();
                                let (stem, extension) = if metadata.kind == StorageEntryKind::File {
                                    value
                                        .rsplit_once('.')
                                        .filter(|(stem, _)| !stem.is_empty())
                                        .map(|(s, e)| (s.to_string(), format!(".{e}")))
                                        .unwrap_or((value.to_string(), String::new()))
                                } else {
                                    (value.to_string(), String::new())
                                };
                                for count in 1..=10000 {
                                    target = destination.join(&WorkspaceRelativePath::parse(
                                        format!("{stem} ({count}){extension}"),
                                    )?);
                                    if !self.session.exists(&target).await? && !protected(&target) {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    ensure_user_mutation_path(&target)?;
                    if protected(&target) {
                        return Err(StorageError::AlreadyExists { path: target }.into());
                    }
                    if operation == TransferOperation::Move {
                        self.session
                            .rename_no_replace(&source.path, &target)
                            .await?;
                    } else {
                        self.session
                            .copy_entry_staged(&source.path, &target)
                            .await?;
                    }
                    self.index
                        .invalidate_paths(&[source.path.clone(), target.clone()])
                        .await;
                    self.mark_modified_locked().await;
                    Ok((TransferStatus::Succeeded, Some(target)))
                }
                .await;
            if let Ok((TransferStatus::Succeeded, Some(target))) = &attempt {
                committed_targets.push(target.clone());
            }
            result.push(match attempt {
                Ok((status, target_path)) => TransferEntryResult {
                    source_path: source.path.clone(),
                    target_path,
                    status,
                    error: None,
                    cleanup_error,
                },
                Err(error) => TransferEntryResult {
                    source_path: source.path.clone(),
                    target_path: None,
                    status: TransferStatus::Failed,
                    error: Some(error.to_string()),
                    cleanup_error: None,
                },
            });
        }
        Ok(result)
    }
    pub async fn new(
        storage_binding: WorkspaceStorageBinding,
        session: Arc<WorkspaceStorageSession>,
        manifest: WorkspaceManifest,
        settings: WorkspaceSettings,
        local_setting: WorkspaceLocalSetting,
        state: WorkspaceState,
    ) -> Result<Self, WorkspaceError> {
        manifest.validate()?;
        validate_workspace_settings(&settings)?;
        validate_local_setting(&local_setting)?;
        validate_workspace_state(&state)?;
        Ok(Self {
            id: manifest.id,
            storage_binding,
            session: session.clone(),
            manifest: RwLock::new(manifest),
            settings: RwLock::new(settings),
            local_setting: RwLock::new(local_setting),
            state: RwLock::new(WorkspaceStateStatus {
                state,
                save_pending: false,
                last_save_error: None,
            }),
            mutation_lock: Mutex::new(()),
            index: WorkspaceIndex::new(session),
        })
    }

    pub async fn manifest(&self) -> WorkspaceManifest {
        self.manifest.read().await.clone()
    }

    pub async fn snapshot(&self) -> WorkspaceSnapshot {
        let manifest = self.manifest().await;
        let settings = self.settings().await;
        WorkspaceSnapshot {
            id: self.id,
            display_name: manifest.display_name,
            storage: WorkspaceStorageView::from(&self.storage_binding),
            settings,
            status: WorkspaceRuntimeStatus::Open,
        }
    }

    pub async fn settings(&self) -> WorkspaceSettings {
        self.settings.read().await.clone()
    }

    pub async fn local_setting(&self) -> WorkspaceLocalSetting {
        self.local_setting.read().await.clone()
    }

    pub async fn state_status(&self) -> WorkspaceStateStatus {
        self.state.read().await.clone()
    }

    /// Manager 投影摘要时串行读取状态并提交 Catalog，避免旧读覆盖重载后的值。
    pub(crate) async fn lock_mutation(&self) -> MutexGuard<'_, ()> {
        self.mutation_lock.lock().await
    }

    pub async fn flush_state(&self) -> Result<WorkspaceStateStatus, WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        self.flush_state_locked().await?;
        Ok(self.state_status().await)
    }

    pub async fn reload_state(&self) -> Result<WorkspaceStateStatus, WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        let current = self.state_status().await;
        if current.save_pending {
            return Err(WorkspaceError::StateSavePending(
                current.last_save_error.unwrap_or_default(),
            ));
        }
        let state = load_workspace_state(self.session.as_ref())
            .await?
            .ok_or_else(|| {
                WorkspaceError::InvalidState("state.json 不存在，请重新打开工作区以初始化".into())
            })?;
        let status = WorkspaceStateStatus {
            state,
            save_pending: false,
            last_save_error: None,
        };
        *self.state.write().await = status.clone();
        Ok(status)
    }

    async fn mark_modified_locked(&self) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        {
            let mut status = self.state.write().await;
            let next = status.state.modified_at.unwrap_or_default().max(timestamp);
            if status.state.modified_at != Some(next) {
                status.state.modified_at = Some(next);
                status.save_pending = true;
            }
        }
        // 主文件已经提交；状态失败单独记录，并在下次修改、flush 或 close 时重试。
        if let Err(error) = self.flush_state_locked().await {
            log::warn!("Workspace {} 状态保存失败，内容已保存: {error}", self.id);
        }
    }

    async fn flush_state_locked(&self) -> Result<(), WorkspaceError> {
        let current = self.state_status().await;
        if !current.save_pending {
            return Ok(());
        }
        match save_workspace_state(self.session.as_ref(), &current.state).await {
            Ok(()) => {
                let mut status = self.state.write().await;
                status.save_pending = false;
                status.last_save_error = None;
                Ok(())
            }
            Err(error) => {
                let message = error.to_string();
                self.state.write().await.last_save_error = Some(message.clone());
                Err(WorkspaceError::StateSavePending(message))
            }
        }
    }

    pub async fn capabilities(&self) -> Result<StorageCapabilities, WorkspaceError> {
        Ok(self.session.capabilities().await?)
    }

    pub async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, WorkspaceError> {
        Ok(self.session.exists(path).await?)
    }

    pub async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, WorkspaceError> {
        Ok(self.session.metadata(path).await?)
    }

    pub async fn list_directory(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, WorkspaceError> {
        Ok(self.session.list_dir(path).await?)
    }

    pub async fn read_bytes(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<u8>, WorkspaceError> {
        Ok(self.session.read(path).await?)
    }

    pub async fn open_read(
        &self,
        path: &WorkspaceRelativePath,
        options: StorageReadOptions,
    ) -> Result<StorageReadStream, WorkspaceError> {
        Ok(self.session.open_read(path, options).await?)
    }

    pub(crate) fn storage_session(&self) -> Arc<WorkspaceStorageSession> {
        Arc::clone(&self.session)
    }

    /// 只返回当前已打开 Provider 提供的真实本机路径；metadata 沿用 Provider 的路径校验。
    pub async fn native_path(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Option<String>, WorkspaceError> {
        let Some(root) = self.session.native_root_path() else {
            return Ok(None);
        };
        self.session.metadata(path).await?;
        // 对外优先返回兼容普通程序的路径；特殊文件名、长路径等仍保留必要的扩展前缀。
        let native_path = root.join(path.as_str());
        Ok(Some(
            dunce::simplified(&native_path)
                .to_string_lossy()
                .into_owned(),
        ))
    }

    pub async fn read_text(&self, path: &WorkspaceRelativePath) -> Result<String, WorkspaceError> {
        String::from_utf8(self.read_bytes(path).await?)
            .map_err(|error| WorkspaceError::Utf8(error.to_string()))
    }

    pub async fn write_bytes(
        &self,
        path: &WorkspaceRelativePath,
        data: &[u8],
        options: WriteOptions,
    ) -> Result<(), WorkspaceError> {
        ensure_user_mutation_path(path)?;
        let _mutation = self.mutation_lock.lock().await;
        self.session.write(path, data, options).await?;
        self.index
            .invalidate_paths(std::slice::from_ref(path))
            .await;
        self.mark_modified_locked().await;
        Ok(())
    }

    pub async fn write_text(
        &self,
        path: &WorkspaceRelativePath,
        text: &str,
        options: WriteOptions,
    ) -> Result<(), WorkspaceError> {
        self.write_bytes(path, text.as_bytes(), options).await
    }

    pub async fn create_directory(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<(), WorkspaceError> {
        ensure_user_mutation_path(path)?;
        let _mutation = self.mutation_lock.lock().await;
        self.session.create_dir_all(path).await?;
        self.index
            .invalidate_paths(std::slice::from_ref(path))
            .await;
        self.mark_modified_locked().await;
        Ok(())
    }

    pub async fn rename(
        &self,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), WorkspaceError> {
        ensure_user_mutation_path(from)?;
        ensure_user_mutation_path(to)?;
        let _mutation = self.mutation_lock.lock().await;
        self.session.rename(from, to).await?;
        self.index
            .invalidate_paths(&[from.clone(), to.clone()])
            .await;
        self.mark_modified_locked().await;
        Ok(())
    }

    pub async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), WorkspaceError> {
        ensure_user_mutation_path(path)?;
        let _mutation = self.mutation_lock.lock().await;
        self.session.remove(path, recursive).await?;
        self.index
            .invalidate_paths(std::slice::from_ref(path))
            .await;
        self.mark_modified_locked().await;
        Ok(())
    }

    pub async fn update_display_name(
        &self,
        display_name: String,
    ) -> Result<WorkspaceManifest, WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        let mut next = self.manifest().await;
        next.display_name = display_name;
        next.validate()?;
        save_manifest(self.session.as_ref(), &next).await?;
        *self.manifest.write().await = next.clone();
        self.mark_modified_locked().await;
        Ok(next)
    }

    pub async fn set_settings(
        &self,
        settings: WorkspaceSettings,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        save_workspace_settings(self.session.as_ref(), &settings).await?;
        {
            let mut current = self.settings.write().await;
            self.index.invalidate().await;
            *current = settings.clone();
        }
        self.mark_modified_locked().await;
        Ok(settings)
    }

    pub async fn mark_opened(&self, opened_at: u64) -> Result<(), WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        let mut next = self.local_setting().await;
        next.last_opened_at = Some(opened_at);
        save_local_setting(self.session.as_ref(), &next).await?;
        *self.local_setting.write().await = next;
        Ok(())
    }

    pub async fn set_last_open_file(
        &self,
        path: Option<WorkspaceRelativePath>,
    ) -> Result<WorkspaceLocalSetting, WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        let mut next = self.local_setting().await;
        next.last_open_file = path;
        save_local_setting(self.session.as_ref(), &next).await?;
        *self.local_setting.write().await = next.clone();
        Ok(next)
    }

    pub async fn get_directory(
        &self,
        path: &WorkspaceRelativePath,
        reload: bool,
    ) -> Result<WorkspaceDirectorySnapshot, WorkspaceError> {
        for _ in 0..3 {
            let settings = self.settings.read().await;
            match self.index.get_directory(path, &settings, reload).await {
                Err(WorkspaceError::IndexChanged) => continue,
                result => return result,
            }
        }
        Err(WorkspaceError::IndexChanged)
    }
    pub async fn refresh_index(&self) -> Result<(), WorkspaceError> {
        self.index.invalidate().await;
        Ok(())
    }
}

fn ensure_user_mutation_path(path: &WorkspaceRelativePath) -> Result<(), WorkspaceError> {
    if path
        .components()
        .next()
        .is_some_and(|component| component.eq_ignore_ascii_case(".lonanote"))
    {
        return Err(StorageError::UnsupportedOperation {
            operation: "modify_workspace_metadata",
        }
        .into());
    }
    Ok(())
}

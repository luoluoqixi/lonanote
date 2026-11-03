use super::*;
use crate::workspace::{
    persistence::PendingRelocation,
    storage::{StorageEntryKind, WorkspaceStorageSession},
};

impl WorkspaceManager {
    /// 仅重新定位已有工作区，不复制、初始化或删除任何目录。
    pub async fn rebind_workspace(
        &self,
        id: &WorkspaceId,
        request: WorkspaceStorageBindingRequest,
    ) -> Result<WorkspaceStorageView, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        if self.runtime.contains(id).await {
            return Err(WorkspaceError::CannotModifyOpenWorkspace(*id));
        }
        // 重新定位只更新绑定，不能隐式执行会清空用户所选目录的迁移恢复。
        let previous = self.catalog.get(id).await?;
        if self
            .catalog
            .snapshot()
            .await
            .pending_relocations
            .iter()
            .any(|entry| entry.workspace_id == *id && !entry.cleanup_abandoned)
        {
            return Err(WorkspaceError::Relocation(
                "存在尚未恢复的迁移，请先处理迁移目录".into(),
            ));
        }
        let binding = self.resolve_binding(request).await?;
        self.ensure_target_unregistered(id, &binding).await?;
        let session = self.storage_resolver.open(&binding).await?;
        validate_workspace(session.as_ref(), id).await?;
        let manifest = load_manifest(session.as_ref())
            .await?
            .ok_or(WorkspaceError::ManifestNotFound)?;
        let modified_at = read_modified_at(session.as_ref(), None).await?;
        let summary = summary_from_manifest(
            &manifest,
            now_timestamp(),
            previous.cached_summary.last_opened_at,
            modified_at,
        );
        self.catalog
            .update_binding_with_summary(id, binding.clone(), summary)
            .await?;
        Ok(WorkspaceStorageView::from(&binding))
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
        self.recover_relocations().await;
        let source_record = self.catalog.get(id).await?;
        if self
            .catalog
            .snapshot()
            .await
            .pending_relocations
            .iter()
            .any(|entry| entry.workspace_id == *id && !entry.cleanup_abandoned)
        {
            return Err(WorkspaceError::Relocation(
                "存在尚未恢复的迁移，请重启应用后重试".into(),
            ));
        }
        let source = source_record.storage_binding;
        let source_session = self.storage_resolver.open(&source).await?;
        validate_workspace(source_session.as_ref(), id).await?;
        let request = match &target {
            WorkspaceStorageTarget::Managed {
                provider_id,
                preferred_directory_name,
            } => WorkspaceStorageBindingRequest {
                provider_id: provider_id.clone(),
                provider_schema_version: 1,
                location: WorkspaceStorageLocation::Managed {
                    directory_name: preferred_directory_name.clone(),
                },
            },
            WorkspaceStorageTarget::External { binding } => {
                if binding.is_managed() {
                    return Err(WorkspaceError::ExpectedExternalBinding);
                }
                binding.clone()
            }
        };
        let target_binding = self.resolve_binding(request).await?;
        if self
            .storage_resolver
            .same_resource(&source, &target_binding)
        {
            return Err(WorkspaceError::SameStorageBinding);
        }
        self.ensure_target_unregistered(id, &target_binding).await?;
        self.storage_resolver
            .validate_relocation(&source, &target_binding)
            .await?;
        let target_session = match target {
            WorkspaceStorageTarget::Managed {
                provider_id,
                preferred_directory_name,
            } => {
                self.storage_resolver
                    .create_managed(&provider_id, &preferred_directory_name)
                    .await?
                    .1
            }
            WorkspaceStorageTarget::External { .. } => {
                let session = self.storage_resolver.open(&target_binding).await?;
                if !session
                    .list_dir(&WorkspaceRelativePath::root())
                    .await?
                    .is_empty()
                {
                    return Err(WorkspaceError::TargetNotEmpty);
                }
                session
            }
        };
        let pending = PendingRelocation {
            workspace_id: *id,
            source: source.clone(),
            target: target_binding.clone(),
            cleanup_abandoned: false,
        };
        // 写记录失败时尚未复制文件；受管理目标只留下一个空目录，绝不删除外部目录。
        if let Err(error) = self.catalog.begin_relocation(pending.clone()).await {
            if target_binding.is_managed() {
                let _ = self
                    .storage_resolver
                    .remove_workspace_root(&target_binding)
                    .await;
            }
            return Err(error);
        }
        let copied = async {
            copy_workspace_tree(source_session.as_ref(), target_session.as_ref()).await?;
            validate_workspace(target_session.as_ref(), id).await?;
            if !trees_match(source_session.as_ref(), target_session.as_ref(), true).await? {
                return Err(WorkspaceError::Relocation(
                    "目录在迁移过程中发生变化，源目录已保留".into(),
                ));
            }
            self.catalog
                .update_binding(id, target_binding.clone())
                .await?;
            Ok::<(), WorkspaceError>(())
        }
        .await;
        if let Err(error) = copied {
            if self.rollback_target(&pending).await.is_ok() {
                let _ = self.catalog.finish_relocation(&pending).await;
            }
            return Err(error);
        }
        let source_cleanup = match self.cleanup_source(&pending).await {
            Ok(()) => StorageCleanupStatus::Removed,
            Err(error) => StorageCleanupStatus::Failed {
                message: error.to_string(),
            },
        };
        // Catalog 已提交，记录清理错误不能把成功迁移误报为失败。
        let journal_result = if matches!(source_cleanup, StorageCleanupStatus::Removed) {
            self.catalog.finish_relocation(&pending).await
        } else {
            self.catalog.abandon_source_cleanup(&pending).await
        };
        if let Err(error) = journal_result {
            log::warn!("清理迁移记录失败: {error}");
        }
        Ok(RelocateWorkspaceResult {
            workspace_id: *id,
            source_storage: WorkspaceStorageView::from(&source),
            target_storage: WorkspaceStorageView::from(&target_binding),
            source_cleanup,
        })
    }

    async fn ensure_target_unregistered(
        &self,
        id: &WorkspaceId,
        target: &WorkspaceStorageBinding,
    ) -> Result<(), WorkspaceError> {
        for record in self.catalog.list().await {
            if record.id != *id
                && self
                    .storage_resolver
                    .same_resource(&record.storage_binding, target)
            {
                return Err(WorkspaceError::AlreadyRegistered(record.id));
            }
        }
        for pending in self.catalog.snapshot().await.pending_relocations {
            if pending.cleanup_abandoned {
                continue;
            }
            if pending.workspace_id != *id
                && (self.storage_resolver.same_resource(&pending.target, target)
                    || self.storage_resolver.same_resource(&pending.source, target))
            {
                return Err(WorkspaceError::Relocation("所选目录正在迁移中".into()));
            }
        }
        Ok(())
    }

    async fn cleanup_source(&self, pending: &PendingRelocation) -> Result<(), WorkspaceError> {
        self.storage_resolver
            .validate_relocation(&pending.source, &pending.target)
            .await?;
        let target = self.storage_resolver.open(&pending.target).await?;
        validate_workspace(target.as_ref(), &pending.workspace_id).await?;
        let source = match self.storage_resolver.open(&pending.source).await {
            Ok(source) => source,
            Err(StorageError::NotFound { .. }) => return Ok(()),
            Err(error) => return Err(error.into()),
        };
        validate_workspace(source.as_ref(), &pending.workspace_id).await?;
        if !trees_match(source.as_ref(), target.as_ref(), true).await? {
            return Err(WorkspaceError::Relocation(
                "源目录或目标目录已经变化，旧文件已保留".into(),
            ));
        }
        self.storage_resolver
            .remove_workspace_root(&pending.source)
            .await?;
        Ok(())
    }

    async fn rollback_target(&self, pending: &PendingRelocation) -> Result<(), WorkspaceError> {
        self.storage_resolver
            .validate_relocation(&pending.source, &pending.target)
            .await?;
        let source = self.storage_resolver.open(&pending.source).await?;
        let target = match self.storage_resolver.open(&pending.target).await {
            Ok(target) => target,
            Err(StorageError::NotFound { .. }) => return Ok(()),
            Err(error) => return Err(error.into()),
        };
        validate_workspace(source.as_ref(), &pending.workspace_id).await?;
        // 只回滚可证实来自源目录的完整文件，未知或被修改的内容一律保留。
        if !trees_match(source.as_ref(), target.as_ref(), false).await? {
            return Err(WorkspaceError::Relocation(
                "目标含有无法确认的内容，请检查迁移目录".into(),
            ));
        }
        if pending.target.is_managed() {
            self.storage_resolver
                .remove_workspace_root(&pending.target)
                .await?;
        } else {
            for entry in target.list_dir(&WorkspaceRelativePath::root()).await? {
                target.remove(&entry.path, true).await?;
            }
        }
        Ok(())
    }

    pub(super) async fn recover_relocations(&self) {
        for pending in self.catalog.snapshot().await.pending_relocations {
            if pending.cleanup_abandoned {
                continue;
            }
            let record = match self.catalog.get(&pending.workspace_id).await {
                Ok(record) => record,
                Err(_) => {
                    // 注销、外部修复或 Catalog 回退均不是删除目录的授权。
                    log::warn!(
                        "迁移记录缺少对应工作区，保留两端目录: {}",
                        pending.workspace_id
                    );
                    continue;
                }
            };
            let committed = record.storage_binding == pending.target;
            if !committed && record.storage_binding != pending.source {
                log::warn!(
                    "工作区绑定已变化，保留历史迁移两端目录: {}",
                    pending.workspace_id
                );
                continue;
            }
            let result = if committed {
                self.cleanup_source(&pending).await
            } else {
                self.rollback_target(&pending).await
            };
            match result {
                Ok(()) => {
                    if let Err(error) = self.catalog.finish_relocation(&pending).await {
                        log::warn!("恢复迁移记录失败: {error}");
                    }
                }
                Err(error) => {
                    log::warn!(
                        "工作区 {} 的迁移需要处理，保留两端目录: {error}",
                        pending.workspace_id
                    );
                    if committed {
                        if let Err(error) = self.catalog.abandon_source_cleanup(&pending).await {
                            log::warn!("保存旧目录隔离状态失败: {error}");
                        }
                    }
                }
            }
        }
    }
}

async fn validate_workspace(
    session: &WorkspaceStorageSession,
    id: &WorkspaceId,
) -> Result<(), WorkspaceError> {
    let manifest = load_manifest(session)
        .await?
        .ok_or(WorkspaceError::ManifestNotFound)?;
    if manifest.id != *id {
        return Err(WorkspaceError::WorkspaceIdMismatch {
            expected: *id,
            actual: manifest.id,
        });
    }
    load_workspace_settings(session).await?;
    load_workspace_state(session).await?;
    Ok(())
}

/// exact=false 用于回滚：目标可以是源目录的未完成子集，不能含任何未知文件。
async fn trees_match(
    source: &WorkspaceStorageSession,
    target: &WorkspaceStorageSession,
    exact: bool,
) -> Result<bool, StorageError> {
    let mut directories = vec![WorkspaceRelativePath::root()];
    while let Some(directory) = directories.pop() {
        let source_entries = source.list_dir(&directory).await?;
        let target_entries = target.list_dir(&directory).await?;
        if exact && source_entries.len() != target_entries.len() {
            return Ok(false);
        }
        for entry in target_entries {
            let Some(original) = source_entries.iter().find(|candidate| {
                candidate.path == entry.path && candidate.metadata.kind == entry.metadata.kind
            }) else {
                return Ok(false);
            };
            match original.metadata.kind {
                StorageEntryKind::Directory => directories.push(entry.path),
                StorageEntryKind::File => {
                    if source.read(&entry.path).await? != target.read(&entry.path).await? {
                        return Ok(false);
                    }
                }
            }
        }
    }
    Ok(true)
}

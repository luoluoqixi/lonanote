use std::collections::{BTreeMap, HashSet};

use uuid::Uuid;

use super::{now_timestamp, record_from_manifest, summary_from_manifest, WorkspaceManager};
use crate::workspace::{
    load_local_setting, load_manifest, load_workspace_settings, save_manifest,
    ResolveScanWorkspaceIdConflictResult, ScanManagedWorkspacesResult,
    ScanWorkspaceConflictCandidate, ScanWorkspaceIdConflict, WorkspaceError, WorkspaceId,
    WorkspaceManifest, WorkspaceRecord, WorkspaceStorageBinding, WorkspaceStorageLocation,
    WorkspaceStorageSession,
};

#[derive(Clone)]
pub(super) struct PendingScanConflict {
    workspace_id: WorkspaceId,
    candidates: Vec<WorkspaceRecord>,
    registered_record: Option<WorkspaceRecord>,
    reserved_ids: HashSet<WorkspaceId>,
}

fn same_folder(left: &WorkspaceStorageBinding, right: &WorkspaceStorageBinding) -> bool {
    left.same_resource(right) || left.same_reference(right)
}

fn location_label(
    binding: &WorkspaceStorageBinding,
    session: Option<&WorkspaceStorageSession>,
) -> String {
    if let Some(root) = session.and_then(WorkspaceStorageSession::native_root_path) {
        return root.display().to_string();
    }
    match &binding.location {
        WorkspaceStorageLocation::Managed { directory_name } => {
            format!("{} / {}", binding.provider_id, directory_name)
        }
        WorkspaceStorageLocation::External { .. } => {
            format!("{}（外部文件夹）", binding.provider_id)
        }
    }
}

impl WorkspaceManager {
    /// 先收集全部合法目录再按 ID 分组；重复组只有用户完成选择后才会修改。
    pub async fn scan_managed_workspaces(
        &self,
    ) -> Result<ScanManagedWorkspacesResult, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        // 新扫描使旧凭据失效，避免跨扫描复用过期文件夹列表。
        self.scan_conflicts.write().await.clear();
        let catalog = self.catalog.snapshot().await;
        let mut result = ScanManagedWorkspacesResult::default();
        let mut groups: BTreeMap<WorkspaceId, Vec<(WorkspaceRecord, String)>> = BTreeMap::new();

        for provider_id in self.storage_resolver.managed_provider_ids() {
            for request in self
                .storage_resolver
                .list_managed_workspace_bindings(&provider_id)
                .await?
            {
                result.scanned_count += 1;
                let candidate = async {
                    let binding = self.resolve_binding(request).await?;
                    let session = self.storage_resolver.open(&binding).await?;
                    let manifest = load_manifest(session.as_ref())
                        .await?
                        .ok_or(WorkspaceError::ManifestNotFound)?;
                    load_workspace_settings(session.as_ref()).await?;
                    let label = location_label(&binding, Some(session.as_ref()));
                    Ok::<_, WorkspaceError>((
                        record_from_manifest(binding, &manifest, now_timestamp()),
                        label,
                    ))
                }
                .await;
                let (mut record, label) = match candidate {
                    Ok(candidate) => candidate,
                    Err(_) => {
                        result.invalid_count += 1;
                        continue;
                    }
                };
                if let Some(existing) = catalog.workspaces.values().find(|existing| {
                    same_folder(&existing.storage_binding, &record.storage_binding)
                }) {
                    if existing.id != record.id {
                        result.binding_conflict_count += 1;
                        continue;
                    }
                    result.already_registered_count += 1;
                    // 保留 Catalog 已解析的 Binding；本机路径别名重新解析的 identity 可能不同。
                    record.storage_binding = existing.storage_binding.clone();
                }
                let group = groups.entry(record.id).or_default();
                if !group.iter().any(|(existing, _)| {
                    same_folder(&existing.storage_binding, &record.storage_binding)
                }) {
                    group.push((record, label));
                }
            }
        }

        let reserved_ids = groups
            .keys()
            .copied()
            .chain(catalog.workspaces.keys().copied())
            .collect::<HashSet<_>>();
        for (workspace_id, mut candidates) in groups {
            let registered_record = catalog.workspaces.get(&workspace_id).cloned();
            // Catalog 中的拥有者可能来自其他 Provider，也必须参与本组选择。
            if let Some(existing) = &registered_record {
                if !candidates.iter().any(|(record, _)| {
                    same_folder(&existing.storage_binding, &record.storage_binding)
                }) {
                    let session = self
                        .storage_resolver
                        .open(&existing.storage_binding)
                        .await
                        .ok();
                    let label = location_label(&existing.storage_binding, session.as_deref());
                    candidates.push((existing.clone(), label));
                }
            }
            candidates.sort_by(|(left, left_label), (right, right_label)| {
                let is_registered = |record: &WorkspaceRecord| {
                    registered_record.as_ref().is_some_and(|existing| {
                        same_folder(&existing.storage_binding, &record.storage_binding)
                    })
                };
                is_registered(right)
                    .cmp(&is_registered(left))
                    .then_with(|| left_label.cmp(right_label))
            });
            if candidates.len() == 1 {
                if registered_record.is_none() {
                    self.catalog.add(candidates.remove(0).0).await?;
                    result.registered_count += 1;
                }
                continue;
            }

            let conflict_id = Uuid::new_v4().to_string();
            let mut views = Vec::with_capacity(candidates.len());
            for (record, label) in &candidates {
                let is_registered = registered_record.as_ref().is_some_and(|existing| {
                    same_folder(&existing.storage_binding, &record.storage_binding)
                });
                views.push(ScanWorkspaceConflictCandidate {
                    display_name: record.cached_summary.display_name.clone(),
                    location_label: label.clone(),
                    is_registered,
                    is_open: is_registered && self.runtime.contains(&workspace_id).await,
                });
            }
            self.scan_conflicts.write().await.insert(
                conflict_id.clone(),
                PendingScanConflict {
                    workspace_id,
                    candidates: candidates.into_iter().map(|(record, _)| record).collect(),
                    registered_record,
                    reserved_ids: reserved_ids.clone(),
                },
            );
            result.id_conflicts.push(ScanWorkspaceIdConflict {
                conflict_id,
                workspace_id,
                candidates: views,
            });
        }
        Ok(result)
    }

    /// 跳过整组只释放临时凭据，不改变 Manifest、Catalog 或 Session。
    pub async fn discard_scan_id_conflict(&self, conflict_id: &str) {
        let _lifecycle = self.lifecycle_lock.write().await;
        self.scan_conflicts.write().await.remove(conflict_id);
    }

    pub async fn resolve_scan_id_conflict(
        &self,
        conflict_id: &str,
        keep_candidate_index: u32,
    ) -> Result<ResolveScanWorkspaceIdConflictResult, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.write().await;
        let plan = self
            .scan_conflicts
            .read()
            .await
            .get(conflict_id)
            .cloned()
            .ok_or_else(|| WorkspaceError::ScanConflict("本次扫描结果已失效，请重新扫描".into()))?;
        let keep_index = keep_candidate_index as usize;
        if keep_index >= plan.candidates.len() {
            return Err(WorkspaceError::ScanConflict(
                "保留的工作区不在本次冲突组中".into(),
            ));
        }
        let catalog = self.catalog.snapshot().await;
        if catalog
            .workspaces
            .get(&plan.workspace_id)
            .map(|record| &record.storage_binding)
            != plan
                .registered_record
                .as_ref()
                .map(|record| &record.storage_binding)
        {
            return Err(WorkspaceError::ScanConflict(
                "工作区记录已变化，请重新扫描".into(),
            ));
        }

        let mut sessions = Vec::with_capacity(plan.candidates.len());
        let mut manifests = Vec::with_capacity(plan.candidates.len());
        // 全组预检完成之前不写入；前端等待选择时目录或 Runtime 可能已变化。
        for (index, candidate) in plan.candidates.iter().enumerate() {
            if catalog.workspaces.values().any(|record| {
                same_folder(&record.storage_binding, &candidate.storage_binding)
                    && record.id != plan.workspace_id
            }) {
                return Err(WorkspaceError::ScanConflict(
                    "文件夹已被其他工作区注册，请重新扫描".into(),
                ));
            }
            let registered = plan.registered_record.as_ref().is_some_and(|record| {
                same_folder(&record.storage_binding, &candidate.storage_binding)
            });
            if registered && index != keep_index && self.runtime.contains(&plan.workspace_id).await
            {
                return Err(WorkspaceError::ScanConflict(
                    "需要更换 ID 的工作区已打开，请先关闭后重新扫描".into(),
                ));
            }
            let session = self
                .storage_resolver
                .open(&candidate.storage_binding)
                .await?;
            let manifest = load_manifest(session.as_ref())
                .await?
                .ok_or(WorkspaceError::ManifestNotFound)?;
            if manifest.id != plan.workspace_id {
                return Err(WorkspaceError::ScanConflict(
                    "文件夹中的 ID 已变化，请重新扫描".into(),
                ));
            }
            load_workspace_settings(session.as_ref()).await?;
            load_local_setting(session.as_ref()).await?;
            if index != keep_index && !session.capabilities().await?.can_write {
                return Err(WorkspaceError::ScanConflict(
                    "需要更换 ID 的工作区文件夹不可写".into(),
                ));
            }
            sessions.push(session);
            manifests.push(manifest);
        }

        let mut reserved_ids = plan.reserved_ids.clone();
        reserved_ids.extend(catalog.workspaces.keys().copied());
        let mut replacements = Vec::with_capacity(plan.candidates.len());
        let mut registered_new_id = plan.workspace_id;
        for (index, candidate) in plan.candidates.iter().enumerate() {
            let mut manifest = manifests[index].clone();
            if index != keep_index {
                manifest.id = loop {
                    let id = WorkspaceId::new();
                    if reserved_ids.insert(id) {
                        break id;
                    }
                };
            }
            let registered = catalog
                .workspaces
                .get(&plan.workspace_id)
                .filter(|record| same_folder(&record.storage_binding, &candidate.storage_binding));
            if registered.is_some() {
                registered_new_id = manifest.id;
            }
            replacements.push(WorkspaceRecord {
                id: manifest.id,
                storage_binding: candidate.storage_binding.clone(),
                cached_summary: summary_from_manifest(
                    &manifest,
                    now_timestamp(),
                    registered.and_then(|record| record.cached_summary.last_opened_at),
                    registered.and_then(|record| record.cached_summary.modified_at),
                ),
            });
        }

        let mut written = Vec::new();
        for (index, replacement) in replacements.iter().enumerate() {
            if index == keep_index {
                continue;
            }
            let mut manifest = manifests[index].clone();
            manifest.id = replacement.id;
            if let Err(error) = save_manifest(sessions[index].as_ref(), &manifest).await {
                rollback_manifests(&sessions, &manifests, &written).await?;
                return Err(error);
            }
            written.push(index);
        }
        let rekeys_registered =
            plan.registered_record.is_some() && registered_new_id != plan.workspace_id;
        // Session 先更新；失败时 Catalog 尚未变化，避免旧 ID 自动打开另一份笔记。
        if rekeys_registered {
            if let Err(error) = self
                .session
                .replace_workspace_id(&plan.workspace_id, registered_new_id)
                .await
            {
                rollback_manifests(&sessions, &manifests, &written).await?;
                return Err(error);
            }
        }
        if let Err(error) = self
            .catalog
            .apply_scan_id_conflict(
                plan.workspace_id,
                plan.registered_record.clone(),
                replacements,
            )
            .await
        {
            let session_rollback = if rekeys_registered {
                self.session
                    .replace_workspace_id(&registered_new_id, plan.workspace_id)
                    .await
            } else {
                Ok(())
            };
            let manifest_rollback = rollback_manifests(&sessions, &manifests, &written).await;
            session_rollback?;
            manifest_rollback?;
            return Err(error);
        }
        self.scan_conflicts.write().await.remove(conflict_id);
        if rekeys_registered {
            self.resource_gateway
                .revoke_workspace(&plan.workspace_id)
                .await;
        }
        Ok(ResolveScanWorkspaceIdConflictResult {
            registered_count: (plan.candidates.len()
                - usize::from(plan.registered_record.is_some()))
                as u32,
            regenerated_count: (plan.candidates.len() - 1) as u32,
        })
    }
}

async fn rollback_manifests(
    sessions: &[std::sync::Arc<WorkspaceStorageSession>],
    manifests: &[WorkspaceManifest],
    written: &[usize],
) -> Result<(), WorkspaceError> {
    let mut failures = Vec::new();
    for &index in written.iter().rev() {
        if let Err(error) = save_manifest(sessions[index].as_ref(), &manifests[index]).await {
            failures.push(error.to_string());
        }
    }
    if failures.is_empty() {
        return Ok(());
    }
    Err(WorkspaceError::ScanConflict(format!(
        "写入失败，部分 ID 无法恢复，请重新扫描：{}",
        failures.join("；")
    )))
}

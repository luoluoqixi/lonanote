use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use tokio::sync::{Mutex, RwLock};

use crate::workspace::{
    domain::{
        WorkspaceCachedSummary, WorkspaceId, WorkspaceRecord, WorkspaceStorageBinding,
        WORKSPACE_CATALOG_SCHEMA_VERSION,
    },
    error::WorkspaceError,
};

use super::json_file::{load_json_with_backup, write_json_atomically};

pub const WORKSPACE_CATALOG_FILE_NAME: &str = "workspace-catalog.json";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceCatalogData {
    pub schema_version: u32,
    /// 是否已经复制过首次启动的默认 Workspace 内容。
    ///
    /// 这是一次性历史标记：用户随后删除默认 Workspace，也不能再次触发复制。
    #[serde(default)]
    pub initial_workspace_copied: bool,
    /// 首次启动自动创建的 Workspace ID。
    ///
    /// 用户普通删除该 Workspace 后仍保留这个 ID，用于保留首次启动历史；GM 调试
    /// 命令可以借此精确删除并重置该状态。
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub initial_workspace_id: Option<WorkspaceId>,
    pub workspaces: HashMap<WorkspaceId, WorkspaceRecord>,
}

impl Default for WorkspaceCatalogData {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_CATALOG_SCHEMA_VERSION,
            initial_workspace_copied: false,
            initial_workspace_id: None,
            workspaces: HashMap::new(),
        }
    }
}

impl WorkspaceCatalogData {
    pub fn validate(&mut self) -> Result<(), WorkspaceError> {
        if self.schema_version != WORKSPACE_CATALOG_SCHEMA_VERSION {
            return Err(WorkspaceError::Catalog(format!(
                "不支持的 Catalog schema: {}",
                self.schema_version
            )));
        }
        for (id, record) in &self.workspaces {
            if *id != record.id {
                return Err(WorkspaceError::Catalog(format!(
                    "Catalog map key {id} 与 record.id {} 不一致",
                    record.id
                )));
            }
            if record.storage_binding.provider_schema_version == 0 {
                return Err(WorkspaceError::Catalog(format!(
                    "Workspace {id} 的 provider schema version 不能为 0"
                )));
            }
        }
        Ok(())
    }
}

#[derive(Debug)]
pub struct WorkspaceCatalog {
    state: RwLock<WorkspaceCatalogData>,
    mutation_lock: Mutex<()>,
    file_path: PathBuf,
}

impl WorkspaceCatalog {
    pub async fn load(file_path: impl Into<PathBuf>) -> Result<Self, WorkspaceError> {
        let file_path = file_path.into();
        let data = load_json_with_backup(
            &file_path,
            "Workspace Catalog",
            catalog_error,
            WorkspaceCatalogData::validate,
        )?;
        Self::from_data(file_path, data)
    }

    pub fn from_data(
        file_path: impl Into<PathBuf>,
        mut data: WorkspaceCatalogData,
    ) -> Result<Self, WorkspaceError> {
        data.validate()?;
        Ok(Self {
            state: RwLock::new(data),
            mutation_lock: Mutex::new(()),
            file_path: file_path.into(),
        })
    }

    pub fn file_path(&self) -> &Path {
        &self.file_path
    }

    pub async fn snapshot(&self) -> WorkspaceCatalogData {
        self.state.read().await.clone()
    }

    pub async fn list(&self) -> Vec<WorkspaceRecord> {
        let mut records = self
            .state
            .read()
            .await
            .workspaces
            .values()
            .cloned()
            .collect::<Vec<_>>();
        records.sort_by(|left, right| {
            left.cached_summary
                .display_name
                .cmp(&right.cached_summary.display_name)
        });
        records
    }

    pub async fn is_empty(&self) -> bool {
        self.state.read().await.workspaces.is_empty()
    }

    pub async fn initial_workspace_copied(&self) -> bool {
        self.state.read().await.initial_workspace_copied
    }

    pub async fn get(&self, id: &WorkspaceId) -> Result<WorkspaceRecord, WorkspaceError> {
        self.state
            .read()
            .await
            .workspaces
            .get(id)
            .cloned()
            .ok_or(WorkspaceError::NotFoundWorkspace(*id))
    }

    pub async fn add(&self, record: WorkspaceRecord) -> Result<(), WorkspaceError> {
        self.update(move |data| {
            if data.workspaces.contains_key(&record.id) {
                return Err(WorkspaceError::AlreadyRegistered(record.id));
            }
            data.workspaces.insert(record.id, record);
            Ok(())
        })
        .await
    }

    /// 写入首次启动创建的 Workspace，并在同一次 Catalog 原子写入中记录历史标记。
    pub async fn add_initial_workspace(
        &self,
        record: WorkspaceRecord,
    ) -> Result<(), WorkspaceError> {
        self.update(move |data| {
            if data.workspaces.contains_key(&record.id) {
                return Err(WorkspaceError::AlreadyRegistered(record.id));
            }
            let workspace_id = record.id;
            data.workspaces.insert(workspace_id, record);
            data.initial_workspace_copied = true;
            data.initial_workspace_id = Some(workspace_id);
            Ok(())
        })
        .await
    }

    /// 清除首次启动历史，并可在同一次原子 Catalog 写入中删除对应 record。
    pub async fn reset_initial_workspace(
        &self,
        workspace_id: Option<WorkspaceId>,
    ) -> Result<Option<WorkspaceRecord>, WorkspaceError> {
        self.update(move |data| {
            data.initial_workspace_copied = false;
            data.initial_workspace_id = None;
            Ok(workspace_id.and_then(|workspace_id| data.workspaces.remove(&workspace_id)))
        })
        .await
    }

    pub async fn add_or_validate_same_binding(
        &self,
        record: WorkspaceRecord,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        self.update(move |data| {
            if let Some(existing) = data.workspaces.get(&record.id) {
                if existing
                    .storage_binding
                    .same_resource(&record.storage_binding)
                {
                    data.workspaces.insert(record.id, record.clone());
                    return Ok(record);
                }
                return Err(WorkspaceError::DuplicateWorkspaceId(record.id));
            }
            data.workspaces.insert(record.id, record.clone());
            Ok(record)
        })
        .await
    }

    pub async fn remove(&self, id: &WorkspaceId) -> Result<WorkspaceRecord, WorkspaceError> {
        let id = *id;
        self.update(move |data| {
            data.workspaces
                .remove(&id)
                .ok_or(WorkspaceError::NotFoundWorkspace(id))
        })
        .await
    }

    /// 将一个已注册 Workspace 原子地改用 Manifest 中的 ID。
    pub async fn replace_workspace_id(
        &self,
        old_id: &WorkspaceId,
        replacement: WorkspaceRecord,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        let old_id = *old_id;
        self.update(move |data| {
            if old_id != replacement.id && data.workspaces.contains_key(&replacement.id) {
                return Err(WorkspaceError::AlreadyRegistered(replacement.id));
            }
            let old_record = data
                .workspaces
                .get(&old_id)
                .ok_or(WorkspaceError::NotFoundWorkspace(old_id))?;
            if !old_record
                .storage_binding
                .same_resource(&replacement.storage_binding)
            {
                return Err(WorkspaceError::Catalog(
                    "Workspace ID 修复不能同时更换 StorageBinding".to_string(),
                ));
            }
            data.workspaces.remove(&old_id);
            if data.initial_workspace_id == Some(old_id) {
                data.initial_workspace_id = Some(replacement.id);
            }
            data.workspaces.insert(replacement.id, replacement.clone());
            Ok(replacement)
        })
        .await
    }

    /// 一次原子 Catalog 写入提交整组冲突，不留下重复 ID 或半组记录。
    pub(crate) async fn apply_scan_id_conflict(
        &self,
        original_id: WorkspaceId,
        expected_record: Option<WorkspaceRecord>,
        replacements: Vec<WorkspaceRecord>,
    ) -> Result<(), WorkspaceError> {
        self.update(move |data| {
            if data
                .workspaces
                .get(&original_id)
                .map(|record| &record.storage_binding)
                != expected_record
                    .as_ref()
                    .map(|record| &record.storage_binding)
            {
                return Err(WorkspaceError::ScanConflict(
                    "工作区记录已变化，请重新扫描".into(),
                ));
            }
            let mut new_ids = std::collections::HashSet::new();
            for replacement in &replacements {
                if !new_ids.insert(replacement.id)
                    || (replacement.id != original_id
                        && data.workspaces.contains_key(&replacement.id))
                {
                    return Err(WorkspaceError::AlreadyRegistered(replacement.id));
                }
                if data.workspaces.values().any(|existing| {
                    existing.id != original_id
                        && (existing
                            .storage_binding
                            .same_resource(&replacement.storage_binding)
                            || existing
                                .storage_binding
                                .same_reference(&replacement.storage_binding))
                }) {
                    return Err(WorkspaceError::ScanConflict(
                        "文件夹已被其他工作区注册，请重新扫描".into(),
                    ));
                }
            }
            if let Some(existing) = expected_record {
                let rekeyed = replacements
                    .iter()
                    .find(|record| {
                        record
                            .storage_binding
                            .same_resource(&existing.storage_binding)
                            || record
                                .storage_binding
                                .same_reference(&existing.storage_binding)
                    })
                    .ok_or_else(|| WorkspaceError::ScanConflict("冲突组缺少已注册工作区".into()))?;
                if data.initial_workspace_id == Some(original_id) {
                    data.initial_workspace_id = Some(rekeyed.id);
                }
                data.workspaces.remove(&original_id);
            }
            for replacement in replacements {
                data.workspaces.insert(replacement.id, replacement);
            }
            Ok(())
        })
        .await
    }

    pub async fn update_binding(
        &self,
        id: &WorkspaceId,
        binding: WorkspaceStorageBinding,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        let id = *id;
        self.update(move |data| {
            let record = data
                .workspaces
                .get_mut(&id)
                .ok_or(WorkspaceError::NotFoundWorkspace(id))?;
            record.storage_binding = binding;
            Ok(record.clone())
        })
        .await
    }

    pub async fn update_summary(
        &self,
        id: &WorkspaceId,
        summary: WorkspaceCachedSummary,
    ) -> Result<(), WorkspaceError> {
        let id = *id;
        self.update(move |data| {
            let record = data
                .workspaces
                .get_mut(&id)
                .ok_or(WorkspaceError::NotFoundWorkspace(id))?;
            record.cached_summary = summary;
            Ok(())
        })
        .await
    }

    async fn update<F, T>(&self, update: F) -> Result<T, WorkspaceError>
    where
        F: FnOnce(&mut WorkspaceCatalogData) -> Result<T, WorkspaceError>,
    {
        let _mutation = self.mutation_lock.lock().await;
        let mut next = self.state.read().await.clone();
        let result = update(&mut next)?;
        next.validate()?;
        write_json_atomically(
            &self.file_path,
            &next,
            "Workspace Catalog",
            catalog_error,
            WorkspaceCatalogData::validate,
        )?;
        *self.state.write().await = next;
        Ok(result)
    }
}

fn catalog_error(message: String) -> WorkspaceError {
    WorkspaceError::Catalog(message)
}

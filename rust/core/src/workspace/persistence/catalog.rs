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
    pub workspaces: HashMap<WorkspaceId, WorkspaceRecord>,
}

impl Default for WorkspaceCatalogData {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_CATALOG_SCHEMA_VERSION,
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
            if record.storage_binding.provider_schema_version() == 0 {
                return Err(WorkspaceError::Catalog(format!(
                    "Workspace {id} 的 provider schema version 不能为 0"
                )));
            }
            if record.storage_binding.resource_identity().is_none() {
                return Err(WorkspaceError::Catalog(format!(
                    "Workspace {id} 的 StorageBinding 尚未解析 resource identity"
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

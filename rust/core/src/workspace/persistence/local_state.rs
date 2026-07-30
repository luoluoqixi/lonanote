use std::{
    collections::{HashMap, HashSet},
    path::{Path, PathBuf},
};

use tokio::sync::{Mutex, RwLock};

use crate::workspace::{
    domain::{
        WorkspaceId, WorkspaceLocalState, WorkspaceRelativePath,
        WORKSPACE_LOCAL_STATE_SCHEMA_VERSION,
    },
    error::WorkspaceError,
};

use super::json_file::{load_json_with_backup, write_json_atomically};

pub const WORKSPACE_LOCAL_STATE_FILE_NAME: &str = "workspace-local-state.json";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceLocalStateData {
    pub schema_version: u32,
    pub last_workspace_id: Option<WorkspaceId>,
    pub workspaces: HashMap<WorkspaceId, WorkspaceLocalState>,
}

impl Default for WorkspaceLocalStateData {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_LOCAL_STATE_SCHEMA_VERSION,
            last_workspace_id: None,
            workspaces: HashMap::new(),
        }
    }
}

impl WorkspaceLocalStateData {
    pub fn validate(&mut self) -> Result<(), WorkspaceError> {
        if self.schema_version != WORKSPACE_LOCAL_STATE_SCHEMA_VERSION {
            return Err(WorkspaceError::LocalState(format!(
                "不支持的本机状态 schema: {}",
                self.schema_version
            )));
        }
        if self
            .last_workspace_id
            .is_some_and(|id| !self.workspaces.contains_key(&id))
        {
            self.last_workspace_id = None;
        }
        Ok(())
    }
}

#[derive(Debug)]
pub struct WorkspaceLocalStateStore {
    state: RwLock<WorkspaceLocalStateData>,
    mutation_lock: Mutex<()>,
    file_path: PathBuf,
}

impl WorkspaceLocalStateStore {
    pub async fn load(file_path: impl Into<PathBuf>) -> Result<Self, WorkspaceError> {
        let file_path = file_path.into();
        let data = load_json_with_backup(
            &file_path,
            "Workspace 本机状态",
            local_state_error,
            WorkspaceLocalStateData::validate,
        )?;
        Self::from_data(file_path, data)
    }

    pub fn from_data(
        file_path: impl Into<PathBuf>,
        mut data: WorkspaceLocalStateData,
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

    pub async fn snapshot(&self) -> WorkspaceLocalStateData {
        self.state.read().await.clone()
    }

    pub async fn last_workspace_id(&self) -> Option<WorkspaceId> {
        self.state.read().await.last_workspace_id
    }

    pub async fn get(&self, id: &WorkspaceId) -> WorkspaceLocalState {
        self.state
            .read()
            .await
            .workspaces
            .get(id)
            .cloned()
            .unwrap_or_default()
    }

    pub async fn mark_opened(
        &self,
        id: &WorkspaceId,
        opened_at: u64,
    ) -> Result<WorkspaceLocalState, WorkspaceError> {
        let id = *id;
        self.update(move |data| {
            let state = data.workspaces.entry(id).or_default();
            state.last_opened_at = Some(opened_at);
            let state = state.clone();
            data.last_workspace_id = Some(id);
            Ok(state)
        })
        .await
    }

    pub async fn set_last_open_file(
        &self,
        id: &WorkspaceId,
        path: Option<WorkspaceRelativePath>,
    ) -> Result<WorkspaceLocalState, WorkspaceError> {
        let id = *id;
        self.update(move |data| {
            let state = data.workspaces.entry(id).or_default();
            state.last_open_file = path;
            Ok(state.clone())
        })
        .await
    }

    pub async fn remove(&self, id: &WorkspaceId) -> Result<(), WorkspaceError> {
        let id = *id;
        self.update(move |data| {
            data.workspaces.remove(&id);
            if data.last_workspace_id == Some(id) {
                data.last_workspace_id = None;
            }
            Ok(())
        })
        .await
    }

    pub async fn reconcile(
        &self,
        valid_workspace_ids: &HashSet<WorkspaceId>,
    ) -> Result<(), WorkspaceError> {
        let snapshot = self.snapshot().await;
        let has_stale_state = snapshot
            .workspaces
            .keys()
            .any(|id| !valid_workspace_ids.contains(id));
        let has_stale_last = snapshot
            .last_workspace_id
            .is_some_and(|id| !valid_workspace_ids.contains(&id));
        if !has_stale_state && !has_stale_last {
            return Ok(());
        }
        let valid_workspace_ids = valid_workspace_ids.clone();
        self.update(move |data| {
            data.workspaces
                .retain(|id, _| valid_workspace_ids.contains(id));
            if data
                .last_workspace_id
                .is_some_and(|id| !valid_workspace_ids.contains(&id))
            {
                data.last_workspace_id = None;
            }
            Ok(())
        })
        .await
    }

    async fn update<F, T>(&self, update: F) -> Result<T, WorkspaceError>
    where
        F: FnOnce(&mut WorkspaceLocalStateData) -> Result<T, WorkspaceError>,
    {
        let _mutation = self.mutation_lock.lock().await;
        let mut next = self.state.read().await.clone();
        let result = update(&mut next)?;
        next.validate()?;
        write_json_atomically(
            &self.file_path,
            &next,
            "Workspace 本机状态",
            local_state_error,
            WorkspaceLocalStateData::validate,
        )?;
        *self.state.write().await = next;
        Ok(result)
    }
}

fn local_state_error(message: String) -> WorkspaceError {
    WorkspaceError::LocalState(message)
}

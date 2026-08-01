use std::path::{Path, PathBuf};

use tokio::sync::{Mutex, RwLock};

use crate::workspace::{domain::WorkspaceId, error::WorkspaceError};

use super::json_file::{load_json_with_backup, write_json_atomically};

pub const WORKSPACE_SESSION_FILE_NAME: &str = "workspace-session.json";
pub const WORKSPACE_SESSION_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSessionData {
    pub schema_version: u32,
    pub last_workspace_id: Option<WorkspaceId>,
}

impl Default for WorkspaceSessionData {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_SESSION_SCHEMA_VERSION,
            last_workspace_id: None,
        }
    }
}

impl WorkspaceSessionData {
    pub fn validate(&mut self) -> Result<(), WorkspaceError> {
        if self.schema_version != WORKSPACE_SESSION_SCHEMA_VERSION {
            return Err(WorkspaceError::Session(format!(
                "不支持的 Workspace session schema: {}",
                self.schema_version
            )));
        }
        Ok(())
    }
}

#[derive(Debug)]
pub struct WorkspaceSessionStore {
    state: RwLock<WorkspaceSessionData>,
    mutation_lock: Mutex<()>,
    file_path: PathBuf,
}

impl WorkspaceSessionStore {
    pub async fn load(file_path: impl Into<PathBuf>) -> Result<Self, WorkspaceError> {
        let file_path = file_path.into();
        let data = load_json_with_backup(
            &file_path,
            "Workspace Session",
            session_error,
            WorkspaceSessionData::validate,
        )?;
        Self::from_data(file_path, data)
    }

    pub fn from_data(
        file_path: impl Into<PathBuf>,
        mut data: WorkspaceSessionData,
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

    pub async fn snapshot(&self) -> WorkspaceSessionData {
        self.state.read().await.clone()
    }

    pub async fn last_workspace_id(&self) -> Option<WorkspaceId> {
        self.state.read().await.last_workspace_id
    }

    pub async fn mark_opened(&self, id: WorkspaceId) -> Result<(), WorkspaceError> {
        self.update(move |data| data.last_workspace_id = Some(id))
            .await
    }

    pub async fn remove(&self, id: &WorkspaceId) -> Result<(), WorkspaceError> {
        let id = *id;
        if self.last_workspace_id().await != Some(id) {
            return Ok(());
        }
        self.update(move |data| {
            if data.last_workspace_id == Some(id) {
                data.last_workspace_id = None;
            }
        })
        .await
    }

    pub async fn reconcile(
        &self,
        valid_workspace_ids: &std::collections::HashSet<WorkspaceId>,
    ) -> Result<(), WorkspaceError> {
        let last_workspace_id = self.last_workspace_id().await;
        if last_workspace_id
            .map(|id| valid_workspace_ids.contains(&id))
            .unwrap_or(true)
        {
            return Ok(());
        }
        self.update(|data| data.last_workspace_id = None).await
    }

    async fn update(
        &self,
        update: impl FnOnce(&mut WorkspaceSessionData),
    ) -> Result<(), WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        let mut next = self.state.read().await.clone();
        update(&mut next);
        next.validate()?;
        write_json_atomically(
            &self.file_path,
            &next,
            "Workspace Session",
            session_error,
            WorkspaceSessionData::validate,
        )?;
        *self.state.write().await = next;
        Ok(())
    }
}

fn session_error(message: String) -> WorkspaceError {
    WorkspaceError::Session(message)
}

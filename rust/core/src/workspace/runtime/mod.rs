use std::{collections::HashMap, sync::Arc};

use tokio::sync::RwLock;

mod index;
mod instance;

pub use instance::WorkspaceInstance;

use crate::workspace::{domain::WorkspaceId, error::WorkspaceError};

#[derive(Debug, Default)]
pub struct WorkspaceRuntime {
    open_workspaces: RwLock<HashMap<WorkspaceId, Arc<WorkspaceInstance>>>,
}

impl WorkspaceRuntime {
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn get(&self, id: &WorkspaceId) -> Option<Arc<WorkspaceInstance>> {
        self.open_workspaces.read().await.get(id).cloned()
    }

    pub async fn contains(&self, id: &WorkspaceId) -> bool {
        self.open_workspaces.read().await.contains_key(id)
    }

    pub async fn insert(
        &self,
        id: WorkspaceId,
        workspace: Arc<WorkspaceInstance>,
    ) -> Result<(), WorkspaceError> {
        let mut workspaces = self.open_workspaces.write().await;
        if workspaces.contains_key(&id) {
            return Err(WorkspaceError::AlreadyOpen(id));
        }
        workspaces.insert(id, workspace);
        Ok(())
    }

    pub async fn remove(&self, id: &WorkspaceId) -> Option<Arc<WorkspaceInstance>> {
        self.open_workspaces.write().await.remove(id)
    }

    pub async fn list_ids(&self) -> Vec<WorkspaceId> {
        self.open_workspaces.read().await.keys().copied().collect()
    }
}

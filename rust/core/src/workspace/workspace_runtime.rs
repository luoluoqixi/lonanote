use std::{collections::HashMap, sync::Arc};

use super::{
    error::WorkspaceError, workspace_id::WorkspaceId, workspace_instance::WorkspaceInstance,
    workspace_registry::PreparedWorkspace,
};

#[derive(Debug, Default)]
pub struct WorkspaceRuntime {
    open_workspaces: HashMap<WorkspaceId, Arc<WorkspaceInstance>>,
}

impl WorkspaceRuntime {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get_open_workspace(&self, workspace_id: &WorkspaceId) -> Option<Arc<WorkspaceInstance>> {
        self.open_workspaces.get(workspace_id).cloned()
    }

    pub fn is_workspace_open(&self, workspace_id: &WorkspaceId) -> bool {
        self.open_workspaces.contains_key(workspace_id)
    }

    pub fn open_workspace(
        &mut self,
        prepared: PreparedWorkspace,
    ) -> Result<(Arc<WorkspaceInstance>, bool), WorkspaceError> {
        if let Some(workspace) = self.get_open_workspace(&prepared.record.id) {
            return Ok((workspace, false));
        }

        let workspace = Arc::new(WorkspaceInstance::new(
            prepared.record.id.clone(),
            prepared.record.locator,
            prepared.mounted_storage,
            &prepared.manifest.settings,
        ));
        self.open_workspaces
            .insert(workspace.id.clone(), Arc::clone(&workspace));
        Ok((workspace, true))
    }

    pub fn close_workspace(
        &mut self,
        workspace_id: &WorkspaceId,
    ) -> Option<Arc<WorkspaceInstance>> {
        self.open_workspaces.remove(workspace_id)
    }
}

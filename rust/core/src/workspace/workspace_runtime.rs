use std::{collections::HashMap, sync::Arc};

use super::{
    error::WorkspaceError, workspace_instance::WorkspaceInstance, workspace_path::WorkspacePath,
    workspace_settings::WorkspaceSettings,
};

#[derive(Debug, Default)]
pub struct WorkspaceRuntime {
    open_workspaces: HashMap<String, Arc<WorkspaceInstance>>,
}

impl WorkspaceRuntime {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get_open_workspace(&self, workspace_id: &str) -> Option<Arc<WorkspaceInstance>> {
        self.open_workspaces.get(workspace_id).cloned()
    }

    pub fn is_workspace_open(&self, workspace_id: &str) -> bool {
        self.open_workspaces.contains_key(workspace_id)
    }

    pub fn open_workspace(
        &mut self,
        workspace_id: &str,
        workspace_path: &WorkspacePath,
        settings: &WorkspaceSettings,
    ) -> Result<(Arc<WorkspaceInstance>, bool), WorkspaceError> {
        if let Some(workspace) = self.get_open_workspace(workspace_id) {
            return Ok((workspace, false));
        }

        let workspace = Arc::new(WorkspaceInstance::new(
            workspace_id.to_string(),
            workspace_path,
            settings,
        )?);
        self.open_workspaces
            .insert(workspace_id.to_string(), Arc::clone(&workspace));

        Ok((workspace, true))
    }

    pub fn close_workspace(&mut self, workspace_id: &str) -> Option<Arc<WorkspaceInstance>> {
        self.open_workspaces.remove(workspace_id)
    }
}

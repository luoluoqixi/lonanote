use serde::{Deserialize, Serialize};

use super::{error::WorkspaceError, workspace::Workspace, workspace_metadata::WorkspaceMetadata};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceManager {
    pub last_workspace: Option<WorkspaceMetadata>,
    pub workspaces: Vec<WorkspaceMetadata>,

    #[serde(skip)]
    pub current_workspace: Option<Workspace>,
}

impl WorkspaceManager {
    pub fn new() -> Self {
        Self {
            current_workspace: None,
            last_workspace: None,
            workspaces: Vec::new(),
        }
    }
    pub fn get_current_workspace(&mut self) -> Result<Option<&Workspace>, WorkspaceError> {
        if self.current_workspace.is_some() {
            Ok(self.current_workspace.as_ref())
        } else if self.last_workspace.is_some() {
            let workspace = self.load_workspace(self.last_workspace.clone().unwrap())?;
            Ok(Some(workspace))
        } else {
            Ok(None)
        }
    }
    pub fn load_workspace(
        &mut self,
        metadata: WorkspaceMetadata,
    ) -> Result<&Workspace, WorkspaceError> {
        let mut workspace = Workspace::new(metadata.clone());
        workspace.init()?;
        self.current_workspace = Some(workspace);

        let workspace = self.workspaces.iter().find(|w| w.name == metadata.name);
        if workspace.is_none() {
            self.workspaces.push(metadata.clone());
        }

        Ok(self.current_workspace.as_ref().unwrap())
    }

    pub fn get_workspaces_metadata(&self) -> &Vec<WorkspaceMetadata> {
        &self.workspaces
    }
}

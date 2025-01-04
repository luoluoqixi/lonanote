use std::{collections::HashMap, sync::Arc};

use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

use super::{
    error::WorkspaceError, workspace_index::WorkspaceIndex, workspace_metadata::WorkspaceMetadata,
    workspace_settings::WorkspaceSettings,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub metadata: WorkspaceMetadata,
    pub settings: WorkspaceSettings,

    #[serde(skip)]
    pub index: Arc<Mutex<WorkspaceIndex>>,
}

impl Workspace {
    pub fn new(metadata: WorkspaceMetadata) -> Self {
        Self {
            metadata,
            settings: WorkspaceSettings::new(),
            index: Arc::new(Mutex::new(WorkspaceIndex::new())),
        }
    }
    pub fn init(&mut self) -> Result<(), WorkspaceError> {
        Ok(())
    }
}

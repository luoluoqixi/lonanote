use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use super::{
    config::{from_json_config, get_indexing, save_json_config, WORKSPACE_INDEX_FILE},
    error::WorkspaceError,
    file_metadata::FileMetadata,
};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceIndex {
    pub files: HashMap<String, FileMetadata>,

    #[serde(skip)]
    pub workspace_path: PathBuf,
}

impl WorkspaceIndex {
    pub fn new(workspace_path: impl AsRef<Path>) -> Result<Self, WorkspaceError> {
        let config = from_json_config::<Self>(&workspace_path, WORKSPACE_INDEX_FILE)?;
        if let Some(mut config) = config {
            config.workspace_path = workspace_path.as_ref().to_path_buf();
            Ok(config)
        } else {
            Ok(Self {
                files: HashMap::new(),
                workspace_path: workspace_path.as_ref().to_path_buf(),
            })
        }
    }

    pub fn update_workspace_path(&mut self, workspace_path: impl AsRef<Path>) {
        self.workspace_path = workspace_path.as_ref().to_path_buf();
    }

    pub async fn save(&self) -> Result<(), WorkspaceError> {
        if get_indexing().await {
            return Ok(());
        }
        save_json_config(&self.workspace_path, WORKSPACE_INDEX_FILE, self)?;

        Ok(())
    }
}

use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::Arc};
use tokio::sync::RwLock;

use super::{
    config::{get_indexing, get_workspace_config_path, get_workspace_index_path},
    error::WorkspaceError,
    workspace_index::WorkspaceIndex,
    workspace_metadata::WorkspaceMetadata,
    workspace_settings::WorkspaceSettings,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub metadata: WorkspaceMetadata,
    pub settings: WorkspaceSettings,

    #[serde(skip)]
    pub index: Arc<RwLock<WorkspaceIndex>>,
}

impl Workspace {
    pub fn new(metadata: WorkspaceMetadata) -> Self {
        Self {
            metadata,
            settings: WorkspaceSettings::new(),
            index: Arc::new(RwLock::new(WorkspaceIndex::new())),
        }
    }

    pub fn get_config_path(&self) -> PathBuf {
        get_workspace_config_path(&self.metadata.path)
    }
    pub fn get_index_path(&self) -> PathBuf {
        get_workspace_index_path(&self.metadata.path)
    }

    pub async fn set_settings(
        &mut self,
        settings: WorkspaceSettings,
    ) -> Result<(), WorkspaceError> {
        self.settings = settings;
        self.save().await?;

        Ok(())
    }

    pub async fn set_metadata(
        &mut self,
        metadata: WorkspaceMetadata,
    ) -> Result<(), WorkspaceError> {
        self.metadata = metadata;
        self.save().await?;

        Ok(())
    }

    pub async fn save(&self) -> Result<(), WorkspaceError> {
        self.save_config().await?;
        self.save_index().await?;

        Ok(())
    }

    pub async fn save_index(&self) -> Result<(), WorkspaceError> {
        if get_indexing().await {
            return Ok(());
        }
        let index_path = self.get_index_path();
        let parent = index_path.parent().unwrap();
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|err| WorkspaceError::IOError(err.to_string()))?;
        }
        let index = self.index.read().await;
        let index = &index.clone();
        let s = serde_json::to_string_pretty(index)
            .map_err(|err| WorkspaceError::JsonError(err.to_string()))?;
        std::fs::write(index_path, s).map_err(|err| WorkspaceError::IOError(err.to_string()))?;

        Ok(())
    }

    pub async fn save_config(&self) -> Result<(), WorkspaceError> {
        let config_path = self.get_config_path();
        let parent = config_path.parent().unwrap();
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|err| WorkspaceError::IOError(err.to_string()))?;
        }
        let s = serde_json::to_string_pretty(self)
            .map_err(|err| WorkspaceError::JsonError(err.to_string()))?;
        std::fs::write(config_path, s).map_err(|err| WorkspaceError::IOError(err.to_string()))?;

        Ok(())
    }
}

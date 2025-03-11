use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::Arc};
use tokio::sync::RwLock;

use super::{
    config::create_workspace_config_folder,
    error::WorkspaceError,
    file_tree::{FileTree, FileTreeSortType},
    workspace_index::WorkspaceIndex,
    workspace_metadata::WorkspaceMetadata,
    workspace_settings::WorkspaceSettings,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceInstance {
    pub metadata: WorkspaceMetadata,
    pub settings: WorkspaceSettings,

    #[serde(skip)]
    pub index: Arc<RwLock<WorkspaceIndex>>,
}

impl WorkspaceInstance {
    pub fn new(workspace_path: &PathBuf) -> Result<Self, WorkspaceError> {
        create_workspace_config_folder(workspace_path)?;
        let settings = WorkspaceSettings::new(workspace_path)?;
        let metadata = WorkspaceMetadata::new(workspace_path)?;
        let index = WorkspaceIndex::new(workspace_path, settings.file_tree_sort_type.clone())?;

        Ok(Self {
            metadata,
            settings,
            index: Arc::new(RwLock::new(index)),
        })
    }

    pub async fn reinit(&self) -> Result<(), WorkspaceError> {
        let index = Arc::clone(&self.index);
        index
            .write()
            .await
            .reinit()
            .map_err(WorkspaceError::InitError)?;

        Ok(())
    }

    pub async fn get_file_tree(&self) -> FileTree {
        self.index.read().await.file_tree.clone()
    }

    pub async fn set_file_tree_sort_type(
        &mut self,
        sort_type: FileTreeSortType,
    ) -> Result<(), WorkspaceError> {
        let mut settings = self.settings.clone();
        settings.file_tree_sort_type = Some(sort_type.clone());
        self.set_settings(settings).await?;
        self.index.write().await.file_tree.set_sort_type(sort_type);

        Ok(())
    }

    pub async fn set_settings(
        &mut self,
        settings: WorkspaceSettings,
    ) -> Result<(), WorkspaceError> {
        self.settings = settings;
        self.settings.workspace_path = self.metadata.path.clone();
        self.save().await?;

        Ok(())
    }

    pub async fn save(&self) -> Result<(), WorkspaceError> {
        self.settings.save().await?;

        Ok(())
    }

    pub async fn unload(&self) -> Result<(), WorkspaceError> {
        Ok(())
    }
}

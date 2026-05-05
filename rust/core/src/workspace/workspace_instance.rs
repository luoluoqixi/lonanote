use serde::Serialize;
use std::sync::Arc;
use tokio::sync::{RwLock, RwLockReadGuard};

use super::{
    config::{create_workspace_config_folder, create_workspace_init_files},
    error::WorkspaceError,
    file_tree::{FileNode, FileTreeSortType},
    workspace_index::WorkspaceIndex,
    workspace_path::WorkspacePath,
    workspace_settings::WorkspaceSettings,
};

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRuntimeConfig {
    pub file_tree_sort_type: FileTreeSortType,
    pub follow_gitignore: bool,
    pub custom_ignore: String,
}

impl From<&WorkspaceSettings> for WorkspaceRuntimeConfig {
    fn from(settings: &WorkspaceSettings) -> Self {
        Self {
            file_tree_sort_type: settings.file_tree_sort_type.clone(),
            follow_gitignore: settings.follow_gitignore,
            custom_ignore: settings.custom_ignore.clone(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenWorkspaceSnapshot {
    pub workspace_id: String,
    pub path: WorkspacePath,
    pub runtime_config: WorkspaceRuntimeConfig,
}

#[derive(Debug)]
pub struct WorkspaceInstance {
    pub workspace_id: String,
    pub workspace_path: WorkspacePath,
    pub runtime_config: Arc<RwLock<WorkspaceRuntimeConfig>>,
    pub index: Arc<RwLock<WorkspaceIndex>>,
}

impl WorkspaceInstance {
    pub fn new(
        workspace_id: impl Into<String>,
        workspace_path: &WorkspacePath,
        settings: &WorkspaceSettings,
    ) -> Result<Self, WorkspaceError> {
        create_workspace_config_folder(workspace_path)?;
        create_workspace_init_files(workspace_path)?;
        let index = WorkspaceIndex::new(workspace_path, settings.file_tree_sort_type.clone())?;

        Ok(Self {
            workspace_id: workspace_id.into(),
            workspace_path: workspace_path.clone(),
            runtime_config: Arc::new(RwLock::new(WorkspaceRuntimeConfig::from(settings))),
            index: Arc::new(RwLock::new(index)),
        })
    }

    pub async fn snapshot(&self) -> OpenWorkspaceSnapshot {
        OpenWorkspaceSnapshot {
            workspace_id: self.workspace_id.clone(),
            path: self.workspace_path.clone(),
            runtime_config: self.get_runtime_config().await,
        }
    }

    pub async fn get_runtime_config(&self) -> WorkspaceRuntimeConfig {
        self.runtime_config.read().await.clone()
    }

    pub async fn apply_settings(&self, settings: &WorkspaceSettings) -> Result<(), WorkspaceError> {
        let next = WorkspaceRuntimeConfig::from(settings);
        let previous = self.get_runtime_config().await;
        if previous == next {
            return Ok(());
        }

        {
            let mut runtime_config = self.runtime_config.write().await;
            *runtime_config = next.clone();
        }

        if previous.follow_gitignore != next.follow_gitignore
            || previous.custom_ignore != next.custom_ignore
        {
            self.reinit().await?;
        } else if previous.file_tree_sort_type != next.file_tree_sort_type {
            self.index
                .write()
                .await
                .file_tree
                .set_sort_type(next.file_tree_sort_type);
        }

        Ok(())
    }

    pub async fn reinit(&self) -> Result<(), WorkspaceError> {
        let runtime_config = self.get_runtime_config().await;
        let index = Arc::clone(&self.index);
        index
            .write()
            .await
            .reinit(
                runtime_config.file_tree_sort_type,
                runtime_config.follow_gitignore,
                runtime_config.custom_ignore,
            )
            .map_err(WorkspaceError::InitError)?;

        Ok(())
    }

    pub async fn get_node(
        &self,
        path: Option<&String>,
        sort_type: FileTreeSortType,
        recursive: bool,
    ) -> Result<FileNode, String> {
        let runtime_config = self.get_runtime_config().await;
        let index = Arc::clone(&self.index);
        let index = index.read().await;
        index.get_node(
            path,
            runtime_config.follow_gitignore,
            runtime_config.custom_ignore,
            recursive,
            sort_type,
        )
    }

    pub async fn get_workspace_index(&self) -> RwLockReadGuard<'_, WorkspaceIndex> {
        self.index.read().await
    }

    pub async fn unload(&self) -> Result<(), WorkspaceError> {
        Ok(())
    }
}

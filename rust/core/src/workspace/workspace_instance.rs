use std::sync::Arc;

use serde::Serialize;
use tokio::sync::RwLock;

use super::{
    file_tree::{FileNode, FileTree, FileTreeError, WorkspaceFileTreeBuilder},
    storage::{MountedStorage, WorkspaceStorage},
    workspace_id::WorkspaceId,
    workspace_locator::WorkspaceLocator,
    workspace_relative_path::WorkspaceRelativePath,
    workspace_settings::WorkspaceSettings,
};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRuntimeConfig {
    pub file_tree_sort_type: super::file_tree::FileTreeSortType,
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

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum WorkspaceRuntimeStatus {
    Opening,
    Opened,
    Closing,
}

#[derive(Debug)]
pub struct WorkspaceInstance {
    pub id: WorkspaceId,
    pub locator: WorkspaceLocator,
    mounted_storage: MountedStorage,
    runtime_config: Arc<RwLock<WorkspaceRuntimeConfig>>,
    runtime_status: Arc<RwLock<WorkspaceRuntimeStatus>>,
    file_tree: Arc<RwLock<Option<FileTree>>>,
}

impl WorkspaceInstance {
    pub fn new(
        id: WorkspaceId,
        locator: WorkspaceLocator,
        mounted_storage: MountedStorage,
        settings: &WorkspaceSettings,
    ) -> Self {
        Self {
            id,
            locator,
            mounted_storage,
            runtime_config: Arc::new(RwLock::new(WorkspaceRuntimeConfig::from(settings))),
            runtime_status: Arc::new(RwLock::new(WorkspaceRuntimeStatus::Opening)),
            file_tree: Arc::new(RwLock::new(None)),
        }
    }

    pub fn storage(&self) -> Arc<dyn WorkspaceStorage> {
        self.mounted_storage.storage()
    }

    pub async fn get_runtime_config(&self) -> WorkspaceRuntimeConfig {
        self.runtime_config.read().await.clone()
    }

    pub async fn get_runtime_status(&self) -> WorkspaceRuntimeStatus {
        self.runtime_status.read().await.clone()
    }

    pub async fn set_runtime_status(&self, status: WorkspaceRuntimeStatus) {
        *self.runtime_status.write().await = status;
    }

    pub async fn mark_opened(&self) {
        self.set_runtime_status(WorkspaceRuntimeStatus::Opened)
            .await;
    }

    pub async fn apply_settings(&self, settings: &WorkspaceSettings) {
        *self.runtime_config.write().await = WorkspaceRuntimeConfig::from(settings);
        self.invalidate_file_tree().await;
    }

    pub async fn get_file_tree(&self, recursive: bool) -> Result<FileTree, FileTreeError> {
        if !recursive {
            if let Some(file_tree) = self.file_tree.read().await.clone() {
                return Ok(file_tree);
            }
        }

        let builder = self.create_file_tree_builder().await?;
        let file_tree = builder.build(recursive).await?;
        if !recursive {
            *self.file_tree.write().await = Some(file_tree.clone());
        }
        Ok(file_tree)
    }

    pub async fn get_file_node(
        &self,
        path: WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<Option<FileNode>, FileTreeError> {
        self.create_file_tree_builder()
            .await?
            .build_entry(path, recursive)
            .await
    }

    pub async fn invalidate_file_tree(&self) {
        *self.file_tree.write().await = None;
    }

    /// 重新读取 provider 的根目录，用于用户刷新或 App 回到前台时同步外部变更。
    pub async fn reinit(&self) -> Result<(), FileTreeError> {
        self.invalidate_file_tree().await;
        self.get_file_tree(false).await?;
        self.set_runtime_status(WorkspaceRuntimeStatus::Opened)
            .await;
        Ok(())
    }

    pub async fn unload(&self) {
        self.invalidate_file_tree().await;
        self.set_runtime_status(WorkspaceRuntimeStatus::Closing)
            .await;
    }

    async fn create_file_tree_builder(&self) -> Result<WorkspaceFileTreeBuilder, FileTreeError> {
        let config = self.get_runtime_config().await;
        WorkspaceFileTreeBuilder::new(
            self.storage(),
            config.file_tree_sort_type,
            config.follow_gitignore,
            &config.custom_ignore,
        )
        .await
    }
}

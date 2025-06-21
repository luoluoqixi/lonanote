use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{RwLock, RwLockReadGuard};

use crate::config::app_path::get_root_dir;

use super::{
    config::{create_workspace_config_folder, create_workspace_init_files},
    error::WorkspaceError,
    file_tree::{FileNode, FileTreeSortType},
    workspace_index::WorkspaceIndex,
    workspace_metadata::WorkspaceMetadata,
    workspace_path::WorkspacePath,
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
    pub fn new(workspace_path: &WorkspacePath) -> Result<Self, WorkspaceError> {
        create_workspace_config_folder(workspace_path)?;
        create_workspace_init_files(workspace_path)?;
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
        if get_root_dir().is_some() {
            // 当 root_dir 存在时, 是在移动端, 而移动端不使用 file_tree, 就不 reinit 了
            return Ok(());
        }
        let follow_gitignore = self.settings.follow_gitignore;
        let custom_ignore = self.settings.custom_ignore.to_owned();
        let sort_type = self.settings.file_tree_sort_type.to_owned();
        let index = Arc::clone(&self.index);
        index
            .write()
            .await
            .reinit(sort_type, follow_gitignore, custom_ignore)
            .map_err(WorkspaceError::InitError)?;

        Ok(())
    }

    pub async fn get_node(
        &self,
        path: Option<&String>,
        sort_type: FileTreeSortType,
        recursive: bool,
    ) -> Result<FileNode, String> {
        let follow_gitignore = self.settings.follow_gitignore;
        let custom_ignore = self.settings.custom_ignore.to_owned();
        let index = Arc::clone(&self.index);
        let index = index.read().await;
        index.get_node(path, follow_gitignore, custom_ignore, recursive, sort_type)
    }

    pub async fn get_workspace_index(&self) -> RwLockReadGuard<'_, WorkspaceIndex> {
        self.index.read().await
    }

    pub async fn set_file_tree_sort_type(
        &mut self,
        sort_type: FileTreeSortType,
    ) -> Result<(), WorkspaceError> {
        let mut settings = self.settings.clone();
        settings.file_tree_sort_type = sort_type.clone();
        self.set_settings(settings).await?;
        self.index.write().await.file_tree.set_sort_type(sort_type);

        Ok(())
    }

    pub async fn set_follow_gitignore(
        &mut self,
        follow_gitignore: bool,
    ) -> Result<(), WorkspaceError> {
        let mut settings = self.settings.clone();
        settings.follow_gitignore = follow_gitignore;
        self.set_settings(settings).await?;
        self.reinit().await?;

        Ok(())
    }

    pub async fn set_custom_ignore(&mut self, custom_ignore: String) -> Result<(), WorkspaceError> {
        let mut settings = self.settings.clone();
        settings.custom_ignore = custom_ignore.clone();
        self.set_settings(settings).await?;
        self.reinit().await?;

        Ok(())
    }

    pub async fn reset_custom_ignore(&mut self) -> Result<(), WorkspaceError> {
        let mut settings = self.settings.clone();
        settings.custom_ignore = WorkspaceSettings::default_custom_ignore();
        self.set_settings(settings).await?;
        self.reinit().await?;

        Ok(())
    }

    pub async fn reset_histroy_snapshoot_count(&mut self) -> Result<(), WorkspaceError> {
        let mut settings = self.settings.clone();
        settings.histroy_snapshoot_count = WorkspaceSettings::default_histroy_snapshoot_count();
        self.set_settings(settings).await?;
        self.reinit().await?;

        Ok(())
    }

    pub async fn reset_upload_attachment_path(&mut self) -> Result<(), WorkspaceError> {
        let mut settings = self.settings.clone();
        settings.upload_attachment_path = WorkspaceSettings::default_upload_attachment_path();
        self.set_settings(settings).await?;
        self.reinit().await?;

        Ok(())
    }

    pub async fn reset_pload_image_path(&mut self) -> Result<(), WorkspaceError> {
        let mut settings = self.settings.clone();
        settings.upload_image_path = WorkspaceSettings::default_upload_image_path();
        self.set_settings(settings).await?;
        self.reinit().await?;

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

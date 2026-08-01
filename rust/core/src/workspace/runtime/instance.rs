use std::sync::Arc;

use tokio::sync::{Mutex, RwLock};

use crate::workspace::{
    domain::{
        WorkspaceId, WorkspaceLocalSetting, WorkspaceManifest, WorkspaceRelativePath,
        WorkspaceRuntimeStatus, WorkspaceSettings, WorkspaceSnapshot, WorkspaceStorageBinding,
        WorkspaceStorageView,
    },
    error::{StorageError, WorkspaceError},
    file_tree::{FileNode, FileTree},
    storage::{
        save_local_setting, save_manifest, save_workspace_settings, validate_local_setting,
        validate_workspace_settings, StorageCapabilities, StorageEntry, StorageEntryMetadata,
        WorkspaceStorageSession, WriteOptions,
    },
};

use super::index::WorkspaceIndex;

#[derive(Debug)]
pub struct WorkspaceInstance {
    pub id: WorkspaceId,
    pub storage_binding: WorkspaceStorageBinding,
    session: Arc<WorkspaceStorageSession>,
    manifest: RwLock<WorkspaceManifest>,
    settings: RwLock<WorkspaceSettings>,
    local_setting: RwLock<WorkspaceLocalSetting>,
    mutation_lock: Mutex<()>,
    index: WorkspaceIndex,
}

impl WorkspaceInstance {
    pub async fn new(
        storage_binding: WorkspaceStorageBinding,
        session: Arc<WorkspaceStorageSession>,
        manifest: WorkspaceManifest,
        settings: WorkspaceSettings,
        local_setting: WorkspaceLocalSetting,
    ) -> Result<Self, WorkspaceError> {
        manifest.validate()?;
        validate_workspace_settings(&settings)?;
        validate_local_setting(&local_setting)?;
        let native_root = session.native_root_path().map(ToOwned::to_owned);
        Ok(Self {
            id: manifest.id,
            storage_binding,
            session,
            manifest: RwLock::new(manifest),
            settings: RwLock::new(settings),
            local_setting: RwLock::new(local_setting),
            mutation_lock: Mutex::new(()),
            index: WorkspaceIndex::new(native_root),
        })
    }

    pub async fn manifest(&self) -> WorkspaceManifest {
        self.manifest.read().await.clone()
    }

    pub async fn snapshot(&self) -> WorkspaceSnapshot {
        let manifest = self.manifest().await;
        let settings = self.settings().await;
        WorkspaceSnapshot {
            id: self.id,
            display_name: manifest.display_name,
            storage: WorkspaceStorageView::from(&self.storage_binding),
            settings,
            status: WorkspaceRuntimeStatus::Open,
        }
    }

    pub async fn settings(&self) -> WorkspaceSettings {
        self.settings.read().await.clone()
    }

    pub async fn local_setting(&self) -> WorkspaceLocalSetting {
        self.local_setting.read().await.clone()
    }

    pub async fn capabilities(&self) -> Result<StorageCapabilities, WorkspaceError> {
        Ok(self.session.capabilities().await?)
    }

    pub async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, WorkspaceError> {
        Ok(self.session.exists(path).await?)
    }

    pub async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, WorkspaceError> {
        Ok(self.session.metadata(path).await?)
    }

    pub async fn list_directory(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, WorkspaceError> {
        Ok(self.session.list_dir(path).await?)
    }

    pub async fn read_bytes(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<u8>, WorkspaceError> {
        Ok(self.session.read(path).await?)
    }

    pub async fn read_text(&self, path: &WorkspaceRelativePath) -> Result<String, WorkspaceError> {
        String::from_utf8(self.read_bytes(path).await?)
            .map_err(|error| WorkspaceError::Utf8(error.to_string()))
    }

    pub async fn write_bytes(
        &self,
        path: &WorkspaceRelativePath,
        data: &[u8],
        options: WriteOptions,
    ) -> Result<(), WorkspaceError> {
        ensure_user_mutation_path(path)?;
        let _mutation = self.mutation_lock.lock().await;
        self.session.write(path, data, options).await?;
        self.index.invalidate().await;
        Ok(())
    }

    pub async fn write_text(
        &self,
        path: &WorkspaceRelativePath,
        text: &str,
        options: WriteOptions,
    ) -> Result<(), WorkspaceError> {
        self.write_bytes(path, text.as_bytes(), options).await
    }

    pub async fn create_directory(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<(), WorkspaceError> {
        ensure_user_mutation_path(path)?;
        let _mutation = self.mutation_lock.lock().await;
        self.session.create_dir_all(path).await?;
        self.index.invalidate().await;
        Ok(())
    }

    pub async fn rename(
        &self,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), WorkspaceError> {
        ensure_user_mutation_path(from)?;
        ensure_user_mutation_path(to)?;
        let _mutation = self.mutation_lock.lock().await;
        self.session.rename(from, to).await?;
        self.index.invalidate().await;
        Ok(())
    }

    pub async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), WorkspaceError> {
        ensure_user_mutation_path(path)?;
        let _mutation = self.mutation_lock.lock().await;
        self.session.remove(path, recursive).await?;
        self.index.invalidate().await;
        Ok(())
    }

    pub async fn update_display_name(
        &self,
        display_name: String,
    ) -> Result<WorkspaceManifest, WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        let mut next = self.manifest().await;
        next.display_name = display_name;
        next.validate()?;
        save_manifest(self.session.as_ref(), &next).await?;
        *self.manifest.write().await = next.clone();
        Ok(next)
    }

    pub async fn set_settings(
        &self,
        settings: WorkspaceSettings,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        save_workspace_settings(self.session.as_ref(), &settings).await?;
        *self.settings.write().await = settings.clone();
        self.index.invalidate().await;
        Ok(settings)
    }

    pub async fn mark_opened(&self, opened_at: u64) -> Result<(), WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        let mut next = self.local_setting().await;
        next.last_opened_at = Some(opened_at);
        save_local_setting(self.session.as_ref(), &next).await?;
        *self.local_setting.write().await = next;
        Ok(())
    }

    pub async fn set_last_open_file(
        &self,
        path: Option<WorkspaceRelativePath>,
    ) -> Result<WorkspaceLocalSetting, WorkspaceError> {
        let _mutation = self.mutation_lock.lock().await;
        let mut next = self.local_setting().await;
        next.last_open_file = path;
        save_local_setting(self.session.as_ref(), &next).await?;
        *self.local_setting.write().await = next.clone();
        Ok(next)
    }

    pub async fn get_tree(&self, recursive: bool) -> Result<FileTree, WorkspaceError> {
        let settings = self.settings().await;
        self.index.get_tree(&settings, recursive).await
    }

    pub async fn get_node(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<FileNode, WorkspaceError> {
        let settings = self.settings().await;
        self.index.get_node(path, &settings, recursive).await
    }

    pub async fn refresh_index(&self) -> Result<(), WorkspaceError> {
        let settings = self.settings().await;
        self.index.refresh(&settings).await
    }
}

fn ensure_user_mutation_path(path: &WorkspaceRelativePath) -> Result<(), WorkspaceError> {
    if path
        .components()
        .next()
        .is_some_and(|component| component == ".lonanote")
    {
        return Err(StorageError::UnsupportedOperation {
            operation: "modify_workspace_metadata",
        }
        .into());
    }
    Ok(())
}

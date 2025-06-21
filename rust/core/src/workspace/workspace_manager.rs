use std::{collections::HashMap, fs, path::Path};

use serde::{Deserialize, Serialize};

use crate::{
    config::app_path::get_root_dir,
    utils::{fs_utils, time_utils::get_now_timestamp},
    workspace::config::DefaultWorkspace,
};

use super::{
    config::get_workspace_global_config_path, error::WorkspaceError,
    workspace_instance::WorkspaceInstance, workspace_metadata::WorkspaceMetadata,
    workspace_path::WorkspacePath, workspace_savedata::WorkspaceSaveData,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceManager {
    pub last_workspace: Option<WorkspacePath>,
    pub workspaces: Vec<WorkspaceMetadata>,
    pub workspaces_savedata: HashMap<WorkspacePath, WorkspaceSaveData>,

    #[serde(skip)]
    pub open_workspaces: HashMap<WorkspacePath, WorkspaceInstance>,
}

impl WorkspaceManager {
    pub fn new() -> Self {
        let config_path = get_workspace_global_config_path();
        if config_path.exists() {
            let data = fs::read_to_string(config_path)
                .map_err(|err| WorkspaceError::IOError(err.to_string()))
                .expect("read workspace config error");
            let manager = serde_json::from_str::<WorkspaceManager>(&data);
            if let Ok(manager) = manager {
                return manager;
            } else if cfg!(debug_assertions) {
                eprintln!(
                    "Error parsing workspace manager config: {:?}",
                    manager.err()
                );
            }
        }
        Self {
            open_workspaces: HashMap::new(),
            last_workspace: None,
            workspaces: Vec::new(),
            workspaces_savedata: HashMap::new(),
        }
    }

    pub async fn import_init_data(&mut self, path: &WorkspacePath) -> Result<(), WorkspaceError> {
        for file_path in DefaultWorkspace::iter() {
            if let Some(file) = DefaultWorkspace::get(file_path.as_ref()) {
                let bytes = file.data.as_ref();

                let mut out_path = path.to_path_buf();
                out_path.push(file_path.as_ref());

                if let Some(parent) = out_path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|err| WorkspaceError::IOError(format!("{}", err)))?;
                }
                fs::write(&out_path, bytes)
                    .map_err(|err| WorkspaceError::IOError(format!("{}", err)))?;
            }
        }
        log::info!("import init data: {}", path.to_path_buf().display());

        Ok(())
    }

    pub async fn init_setup(&mut self, path: &WorkspacePath) -> Result<(), WorkspaceError> {
        let mut settings = crate::settings::get_settings_mut().await;

        if settings.first_setup {
            log::info!("start import init data...");

            if self.workspaces.is_empty() {
                self.create_workspace(path).await?;
                self.import_init_data(path).await?;
                self.last_workspace.replace(path.clone());
                log::info!("import init data finish");
            } else {
                log::info!("workspaces is not empty, jump import");
            }

            settings.first_setup = false;
            settings
                .save()
                .map_err(|err| WorkspaceError::InitError(format!("{}", err)))?;
        } else {
            log::info!("first_setup is false, jump import data");
        }

        Ok(())
    }

    pub fn get_workspace(&self, path: &WorkspacePath) -> Option<&WorkspaceInstance> {
        if self.open_workspaces.contains_key(path) {
            Some(self.open_workspaces.get(path).unwrap())
        } else {
            None
        }
    }

    pub fn get_workspace_mut(&mut self, path: &WorkspacePath) -> Option<&mut WorkspaceInstance> {
        if self.open_workspaces.contains_key(path) {
            Some(self.open_workspaces.get_mut(path).unwrap())
        } else {
            None
        }
    }

    pub async fn create_workspace(&mut self, path: &WorkspacePath) -> Result<(), WorkspaceError> {
        let path_buf = path.to_path_buf();
        if !path_buf.exists() {
            std::fs::create_dir_all(&path_buf)
                .map_err(|err| WorkspaceError::IOError(err.to_string()))?;
        } else if path_buf.is_file() {
            return Err(WorkspaceError::IOError(format!(
                "the path is a file: {}",
                path_buf.display()
            )));
        }
        if self.workspaces.iter().any(|x| x.path == *path) {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                path_buf.display().to_string(),
            ));
        }

        let workspace = WorkspaceInstance::new(path)?;
        self.workspaces.push(workspace.metadata.clone());
        self.save()?;

        Ok(())
    }

    pub async fn load_workspace(&mut self, path: &WorkspacePath) -> Result<(), WorkspaceError> {
        if self.open_workspaces.contains_key(path) {
            return Ok(());
        }
        let workspace_path = path.to_path_buf_cow();
        if !workspace_path.exists() {
            return Err(WorkspaceError::NotFoundPath(
                workspace_path.display().to_string(),
            ));
        }
        let mut workspace = WorkspaceInstance::new(path)?;
        if workspace.settings.create_time.is_none() {
            workspace
                .settings
                .update_create_time(get_now_timestamp())
                .await?;
        } else {
            workspace.settings.update_time(get_now_timestamp()).await?;
        }

        let f = self.workspaces.iter_mut().find(|w| w.path == *path);

        if let Some(metadata) = f {
            metadata.update_time(
                workspace.settings.create_time,
                workspace.settings.update_time,
            );
        } else {
            self.workspaces.push(workspace.metadata.clone());
        }

        if !self.workspaces_savedata.contains_key(path) {
            self.workspaces_savedata
                .insert(path.clone(), WorkspaceSaveData::new());
        }
        self.last_workspace = Some(workspace.metadata.path.clone());

        workspace.reinit().await?;
        // println!("open workspace: {:?}", &self.last_workspace);
        self.open_workspaces.insert(path.clone(), workspace);
        self.save()?;

        Ok(())
    }

    pub async fn unload_workspace(&mut self, path: &WorkspacePath) -> Result<(), WorkspaceError> {
        if !self.open_workspaces.contains_key(path) {
            return Ok(());
        }
        let workspace = self.open_workspaces.remove(path).unwrap();
        workspace.unload().await?;

        Ok(())
    }

    pub fn get_workspaces_metadata(&self) -> &Vec<WorkspaceMetadata> {
        &self.workspaces
    }

    pub fn set_workspace_savedata(
        &mut self,
        path: &WorkspacePath,
        savedata: WorkspaceSaveData,
    ) -> Result<(), WorkspaceError> {
        if !self.workspaces_savedata.contains_key(path) {
            if !self.workspaces.iter().any(|w| w.path == *path) {
                return Err(WorkspaceError::NotFoundWorkspace(
                    path.to_path_buf_cow().display().to_string(),
                ));
            }
            self.workspaces_savedata
                .insert(path.clone(), WorkspaceSaveData::new());
        }
        self.workspaces_savedata.insert(path.clone(), savedata);

        self.save()?;
        Ok(())
    }

    pub fn get_workspace_savedata(
        &self,
        path: &WorkspacePath,
    ) -> Result<Option<&WorkspaceSaveData>, WorkspaceError> {
        if !self.workspaces_savedata.contains_key(path) {
            if !self.workspaces.iter().any(|w| w.path == *path) {
                return Err(WorkspaceError::NotFoundWorkspace(
                    path.to_path_buf_cow().display().to_string(),
                ));
            }
            return Ok(None);
        }
        Ok(Some(self.workspaces_savedata.get(path).unwrap()))
    }

    pub async fn remove_workspace(
        &mut self,
        path: &WorkspacePath,
        delete_file: bool,
    ) -> Result<(), WorkspaceError> {
        if self.open_workspaces.contains_key(path) {
            return Err(WorkspaceError::RemoveAlreadyOpenWorkspace(
                path.to_path_buf_cow().display().to_string(),
            ));
        }
        if let Some(index) = self.workspaces.iter().position(|w| w.path == *path) {
            let ws = self.workspaces.remove(index);
            if self.workspaces_savedata.contains_key(path) {
                self.workspaces_savedata.remove(path);
            }
            if delete_file && ws.path.exists() {
                let ws_path = ws.path.to_path_buf();
                fs::remove_dir_all(ws_path)
                    .map_err(|e| WorkspaceError::IOError(format!("delete dir error: {e}")))?;
            }
        }

        self.save()?;
        Ok(())
    }

    pub async fn set_workspace_name(
        &mut self,
        path: &WorkspacePath,
        new_name: impl AsRef<str>,
        is_move: bool,
    ) -> Result<(), WorkspaceError> {
        let new_path = if get_root_dir().is_some() {
            // 当 root_dir 存在时, 只存储 name
            new_name.as_ref().to_string()
        } else {
            let new_path = path
                .to_path_buf_cow()
                .parent()
                .ok_or(WorkspaceError::UnknowError(format!(
                    "path is no parent: {:?}",
                    path.to_path_buf_cow()
                )))?
                .join(new_name.as_ref());
            let new_path = new_path.to_str().ok_or(WorkspaceError::UnknowError(
                "parse path str error".to_string(),
            ))?;
            new_path.to_string()
        };

        self.set_workspace_path(path, &WorkspacePath::from(new_path.as_str()), is_move)
            .await?;

        Ok(())
    }

    pub async fn set_workspace_root_path(
        &mut self,
        path: &WorkspacePath,
        new_root_path: impl AsRef<Path>,
        is_move: bool,
    ) -> Result<(), WorkspaceError> {
        let name = WorkspaceMetadata::get_file_name(path.to_path_buf())?;
        if get_root_dir().is_some() {
            // 当 root_dir 存在时, 不允许设置root_path
            return Err(WorkspaceError::UnknowError(
                "not support set_workspace_root_path".to_string(),
            ));
        };

        let new_path = new_root_path.as_ref().join(name);
        let new_path = new_path.to_str().ok_or(WorkspaceError::UnknowError(
            "parse path str error".to_string(),
        ))?;
        let new_path = new_path.to_string();

        self.set_workspace_path(path, &WorkspacePath::from(new_path.as_str()), is_move)
            .await?;

        Ok(())
    }

    pub async fn set_workspace_path(
        &mut self,
        path: &WorkspacePath,
        new_path: &WorkspacePath,
        is_move: bool,
    ) -> Result<(), WorkspaceError> {
        if self.open_workspaces.contains_key(path) {
            return Err(WorkspaceError::AlreadyExistOpenWorkspace(
                path.to_path_buf_cow().display().to_string(),
            ));
        }

        if path == new_path {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                new_path.to_path_buf_cow().display().to_string(),
            ));
        }

        // let path = path.to_path_buf();
        // let new_path = new_path.as_ref().to_path_buf();
        let exists_workspace = self.workspaces.iter().find(|w| w.path == *new_path);
        if exists_workspace.is_some() {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                new_path.to_path_buf_cow().display().to_string(),
            ));
        }
        let workspace = self.workspaces.iter_mut().find(|w| w.path == *path);
        if let Some(workspace) = workspace {
            if is_move {
                if new_path.exists() {
                    return Err(WorkspaceError::IOError(format!(
                        "target path already exist: {:?}",
                        new_path.to_path_buf_cow().display()
                    )));
                }
                // println!("src_folder: {:?}, target_folder: {:?}", &path, &new_path);
                fs_utils::copy(path.to_path_buf(), new_path.to_path_buf(), false).map_err(|e| {
                    WorkspaceError::IOError(format!(
                        "copy folder error: {} >> {}, {}",
                        path.to_path_buf_cow().display(),
                        new_path.to_path_buf_cow().display(),
                        e,
                    ))
                })?;
                fs::remove_dir_all(path.to_path_buf()).map_err(|e| {
                    WorkspaceError::IOError(format!(
                        "delete origin folder error: {}, {}",
                        path.to_path_buf_cow().display(),
                        e,
                    ))
                })?;
            }

            let new_metadata = WorkspaceMetadata::new(new_path)?;

            if let Some(last_workspace) = &mut self.last_workspace {
                // 更新上个workspace
                if *last_workspace == *path {
                    *last_workspace = new_metadata.path.clone();
                }
            }
            *workspace = new_metadata;
            self.save()?;

            Ok(())
        } else {
            Err(WorkspaceError::NotFoundWorkspace(
                path.to_path_buf_cow().display().to_string(),
            ))
        }
    }

    pub fn save(&self) -> Result<(), WorkspaceError> {
        let config_path = get_workspace_global_config_path();
        let parent = config_path
            .parent()
            .ok_or(WorkspaceError::UnknowError(format!(
                "config_path no parent: {:?}",
                &config_path
            )))?;
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|err| WorkspaceError::IOError(err.to_string()))?;
        }
        let s = serde_json::to_string_pretty(self)
            .map_err(|err| WorkspaceError::JsonError(err.to_string()))?;
        fs::write(config_path, s).map_err(|err| WorkspaceError::IOError(err.to_string()))?;

        Ok(())
    }
}

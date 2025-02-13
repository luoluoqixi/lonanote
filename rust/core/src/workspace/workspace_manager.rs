use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

use crate::utils::fs_utils;

use super::{
    config::get_workspace_global_config_path, error::WorkspaceError,
    workspace_instance::WorkspaceInstance, workspace_metadata::WorkspaceMetadata,
    workspace_savedata::WorkspaceSaveData,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceManager {
    pub last_workspace: Option<PathBuf>,
    pub workspaces: Vec<WorkspaceMetadata>,
    pub workspaces_savedata: HashMap<PathBuf, WorkspaceSaveData>,

    #[serde(skip)]
    pub open_workspaces: HashMap<PathBuf, WorkspaceInstance>,
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

    pub fn get_workspace(&self, path: impl AsRef<Path>) -> Option<&WorkspaceInstance> {
        if self.open_workspaces.contains_key(path.as_ref()) {
            Some(self.open_workspaces.get(path.as_ref()).unwrap())
        } else {
            None
        }
    }

    pub fn get_workspace_mut(&mut self, path: impl AsRef<Path>) -> Option<&mut WorkspaceInstance> {
        if self.open_workspaces.contains_key(path.as_ref()) {
            Some(self.open_workspaces.get_mut(path.as_ref()).unwrap())
        } else {
            None
        }
    }

    pub fn load_workspace(&mut self, path: impl AsRef<Path>) -> Result<(), WorkspaceError> {
        if self.open_workspaces.contains_key(path.as_ref()) {
            return Ok(());
        }
        let workspace_path = PathBuf::from(path.as_ref());
        if !workspace_path.exists() {
            return Err(WorkspaceError::NotFoundPath(
                path.as_ref().display().to_string(),
            ));
        }
        let workspace = WorkspaceInstance::new(&workspace_path)?;
        let f = self
            .workspaces
            .iter_mut()
            .find(|w| w.path == workspace_path);
        if let Some(metadata) = f {
            metadata.update_time(workspace.metadata.last_open_time);
        } else {
            self.workspaces.push(workspace.metadata.clone());
        }
        if !self.workspaces_savedata.contains_key(&workspace_path) {
            self.workspaces_savedata
                .insert(workspace_path.to_path_buf(), WorkspaceSaveData::new());
        }
        self.last_workspace = Some(workspace.metadata.path.clone());
        // println!("open workspace: {:?}", &self.last_workspace);
        self.open_workspaces
            .insert(path.as_ref().to_path_buf(), workspace);
        self.save()?;

        Ok(())
    }

    pub async fn unload_workspace(&mut self, path: impl AsRef<Path>) -> Result<(), WorkspaceError> {
        if !self.open_workspaces.contains_key(path.as_ref()) {
            return Ok(());
        }
        let workspace = self.open_workspaces.remove(path.as_ref()).unwrap();
        workspace.unload().await?;

        Ok(())
    }

    pub fn get_workspaces_metadata(&self) -> &Vec<WorkspaceMetadata> {
        &self.workspaces
    }

    pub fn set_workspace_savedata(
        &mut self,
        path: impl AsRef<Path>,
        savedata: WorkspaceSaveData,
    ) -> Result<(), WorkspaceError> {
        if !self.workspaces_savedata.contains_key(path.as_ref()) {
            if !self.workspaces.iter().any(|w| w.path == path.as_ref()) {
                return Err(WorkspaceError::NotFoundWorkspace(
                    path.as_ref().display().to_string(),
                ));
            }
            self.workspaces_savedata
                .insert(path.as_ref().to_path_buf(), WorkspaceSaveData::new());
        }
        self.workspaces_savedata
            .insert(path.as_ref().to_path_buf(), savedata);

        self.save()?;
        Ok(())
    }

    pub fn get_workspace_savedata(
        &self,
        path: impl AsRef<Path>,
    ) -> Result<Option<&WorkspaceSaveData>, WorkspaceError> {
        if !self.workspaces_savedata.contains_key(path.as_ref()) {
            if !self.workspaces.iter().any(|w| w.path == path.as_ref()) {
                return Err(WorkspaceError::NotFoundWorkspace(
                    path.as_ref().display().to_string(),
                ));
            }
            return Ok(None);
        }
        Ok(Some(self.workspaces_savedata.get(path.as_ref()).unwrap()))
    }

    pub async fn remove_workspace(&mut self, path: impl AsRef<Path>) -> Result<(), WorkspaceError> {
        if self.open_workspaces.contains_key(path.as_ref()) {
            return Err(WorkspaceError::RemoveAlreadyOpenWorkspace(
                path.as_ref().display().to_string(),
            ));
        }
        if let Some(index) = self.workspaces.iter().position(|w| w.path == path.as_ref()) {
            self.workspaces.remove(index);
            if self.workspaces_savedata.contains_key(path.as_ref()) {
                self.workspaces_savedata.remove(path.as_ref());
            }
        }

        self.save()?;
        Ok(())
    }

    pub async fn set_workspace_name(
        &mut self,
        path: impl AsRef<Path>,
        new_name: impl AsRef<str>,
        is_move: bool,
    ) -> Result<(), WorkspaceError> {
        let new_path = path
            .as_ref()
            .parent()
            .ok_or(WorkspaceError::UnknowError(format!(
                "path is no parent: {:?}",
                path.as_ref()
            )))?
            .join(new_name.as_ref());
        self.set_workspace_path(path, new_path, is_move).await?;

        Ok(())
    }

    pub async fn set_workspace_root_path(
        &mut self,
        path: impl AsRef<Path>,
        new_root_path: impl AsRef<Path>,
        is_move: bool,
    ) -> Result<(), WorkspaceError> {
        let name = WorkspaceMetadata::get_file_name(&path)?;
        let new_path = new_root_path.as_ref().join(name);
        self.set_workspace_path(path, new_path, is_move).await?;

        Ok(())
    }

    pub async fn set_workspace_path(
        &mut self,
        path: impl AsRef<Path>,
        new_path: impl AsRef<Path>,
        is_move: bool,
    ) -> Result<(), WorkspaceError> {
        if self.open_workspaces.contains_key(path.as_ref()) {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                path.as_ref().display().to_string(),
            ));
        }

        if path.as_ref() == new_path.as_ref() {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                new_path.as_ref().display().to_string(),
            ));
        }

        let path = path.as_ref().to_path_buf();
        let new_path = new_path.as_ref().to_path_buf();
        let exists_workspace = self.workspaces.iter().find(|w| w.path == new_path);
        if exists_workspace.is_some() {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                new_path.display().to_string(),
            ));
        }
        let workspace = self.workspaces.iter_mut().find(|w| w.path == path);
        if let Some(workspace) = workspace {
            if is_move {
                if new_path.exists() {
                    return Err(WorkspaceError::IOError(format!(
                        "target path already exist: {:?}",
                        new_path.display()
                    )));
                }
                // println!("src_folder: {:?}, target_folder: {:?}", &path, &new_path);
                fs_utils::move_folder(&path, &new_path, false)
                    .map_err(|e| WorkspaceError::IOError(e.to_string()))?;
            }

            let new_metadata = WorkspaceMetadata::new(new_path.clone())?;

            if let Some(last_workspace) = &mut self.last_workspace {
                // 更新上个workspace
                if *last_workspace == path {
                    *last_workspace = new_metadata.path.clone();
                }
            }
            *workspace = new_metadata;
            self.save()?;

            Ok(())
        } else {
            Err(WorkspaceError::NotFoundWorkspace(
                path.display().to_string(),
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

use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};

use crate::{settings::get_settings, utils::fs_utils};

use super::{
    config::get_workspace_global_config_path, error::WorkspaceError, workspace::Workspace,
    workspace_metadata::WorkspaceMetadata,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceManager {
    pub last_workspace: Option<WorkspaceMetadata>,
    pub workspaces: Vec<WorkspaceMetadata>,

    #[serde(skip)]
    pub current_workspace: Option<Workspace>,
}

impl WorkspaceManager {
    pub fn new() -> Self {
        let config_path = get_workspace_global_config_path();
        if config_path.exists() {
            let data = fs::read_to_string(config_path)
                .map_err(|err| WorkspaceError::IOError(err.to_string()))
                .expect("read workspace config error");
            let manager = serde_json::from_str::<WorkspaceManager>(&data);
            if manager.is_ok() {
                return manager.unwrap();
            } else {
                if cfg!(debug_assertions) {
                    eprintln!(
                        "Error parsing workspace manager config: {:?}",
                        manager.err()
                    );
                }
            }
        }
        return Self {
            current_workspace: None,
            last_workspace: None,
            workspaces: Vec::new(),
        };
    }
    pub async fn get_init_workspace(&mut self) -> Result<Option<&Workspace>, WorkspaceError> {
        if self.current_workspace.is_some() {
            Ok(self.current_workspace.as_ref())
        } else {
            #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos",))]
            {
                // TODO 检测是否有另一个实例运行, 如果有, 那么就不自动打开上次的工作区
            }
            let settings = get_settings().await;
            if settings.auto_open_last_workspace && self.last_workspace.is_some() {
                let path = self.last_workspace.as_ref().unwrap().path.to_str();
                if let Some(path) = path {
                    if fs::exists(&path).map_err(|e| WorkspaceError::IOError(e.to_string()))? {
                        let workspace = self.load_workspace(path.to_string())?;
                        return Ok(Some(workspace));
                    }
                }
            }
            Ok(None)
        }
    }
    pub fn get_current_workspace(&self) -> Result<Option<&Workspace>, WorkspaceError> {
        if self.current_workspace.is_some() {
            Ok(self.current_workspace.as_ref())
        } else {
            Ok(None)
        }
    }
    pub fn get_current_workspace_mut(&mut self) -> Result<Option<&mut Workspace>, WorkspaceError> {
        if self.current_workspace.is_some() {
            Ok(self.current_workspace.as_mut())
        } else {
            Ok(None)
        }
    }

    pub fn load_workspace(&mut self, path: impl AsRef<str>) -> Result<&Workspace, WorkspaceError> {
        let workspace_path = PathBuf::from(path.as_ref());
        if !workspace_path.exists() {
            return Err(WorkspaceError::NotFoundPath(path.as_ref().to_string()));
        }
        let workspace = Workspace::new(&workspace_path)?;
        let f = self
            .workspaces
            .iter_mut()
            .find(|w| w.path == workspace_path);
        if let Some(metadata) = f {
            metadata.update_time(workspace.metadata.last_open_time);
        } else {
            self.workspaces.push(workspace.metadata.clone());
        }
        self.last_workspace = Some(workspace.metadata.clone());
        self.current_workspace = Some(workspace);
        self.save()?;

        Ok(self.current_workspace.as_ref().unwrap())
    }

    pub fn get_workspaces_metadata(&self) -> &Vec<WorkspaceMetadata> {
        &self.workspaces
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
        self.set_workspace_path(
            path,
            new_path
                .to_str()
                .ok_or(WorkspaceError::UnknowError(format!(
                    "path to_str error: {:?}",
                    &new_path
                )))?,
            is_move,
        )
        .await?;

        Ok(())
    }

    pub async fn set_workspace_path(
        &mut self,
        path: impl AsRef<Path>,
        new_path: impl AsRef<str>,
        is_move: bool,
    ) -> Result<(), WorkspaceError> {
        let path_str = path
            .as_ref()
            .to_str()
            .ok_or(WorkspaceError::UnknowError(format!(
                "path to_str error: {:?}",
                path.as_ref()
            )))?;
        let new_path_str = new_path.as_ref();
        if path_str == new_path_str {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                new_path_str.to_string(),
            ));
        }

        let path = PathBuf::from(path.as_ref());
        let new_path = PathBuf::from(new_path.as_ref());
        let exists_workspace = self.workspaces.iter().find(|w| w.path == new_path);
        if exists_workspace.is_some() {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                new_path_str.to_string(),
            ));
        }
        let workspace = self.workspaces.iter_mut().find(|w| w.path == path);
        if let Some(workspace) = workspace {
            let new_metadata = WorkspaceMetadata::new(new_path.clone());

            if let Some(current_workspace) = &mut self.current_workspace {
                // 更新当前workspace
                if current_workspace.metadata.path == path {
                    current_workspace.set_metadata(new_metadata.clone()).await?;
                }
            }
            if let Some(last_workspace) = &mut self.last_workspace {
                // 更新上个workspace
                if last_workspace.path == path {
                    *last_workspace = new_metadata.clone();
                }
            }
            *workspace = new_metadata;
            self.save()?;

            if is_move {
                if new_path.exists() {
                    return Err(WorkspaceError::IOError(format!(
                        "target path already exist: {:?}",
                        &new_path
                    )));
                }
                // println!("src_folder: {:?}, target_folder: {:?}", &path, &new_path);
                fs_utils::move_folder(path, new_path, false)
                    .map_err(|e| WorkspaceError::IOError(e.to_string()))?;
            }

            Ok(())
        } else {
            Err(WorkspaceError::NotFoundWorkspace(path_str.to_string()))
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

use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};

use crate::settings::SETTINGS;

use super::{
    config::{
        create_workspace_config_folder, get_workspace_config_path, get_workspace_global_config_path,
    },
    error::WorkspaceError,
    workspace::Workspace,
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
            let settings = SETTINGS.read().await;
            if settings.auto_open_last_workspace && self.last_workspace.is_some() {
                let path = self.last_workspace.as_ref().unwrap().path.clone();
                if fs::exists(&path).map_err(|e| WorkspaceError::IOError(e.to_string()))? {
                    let workspace = self.load_workspace(path)?;
                    return Ok(Some(workspace));
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

    pub fn load_workspace(&mut self, path: impl AsRef<str>) -> Result<&Workspace, WorkspaceError> {
        let workspace_path = PathBuf::from(path.as_ref());
        if !workspace_path.exists() {
            return Err(WorkspaceError::NotFoundPath(path.as_ref().to_string()));
        }
        create_workspace_config_folder(&workspace_path)?;
        let config_path = get_workspace_config_path(&workspace_path);
        let workspace = if config_path.exists() {
            let data = fs::read_to_string(config_path)
                .map_err(|err| WorkspaceError::IOError(err.to_string()))?;
            let workspace = serde_json::from_str::<Workspace>(&data)
                .map_err(|err| WorkspaceError::ParseConfigError(err.to_string()))?;
            workspace
        } else {
            let name = workspace_path
                .file_stem()
                .map(|s| s.to_str().unwrap())
                .unwrap_or("New Workspace");
            let metadata = WorkspaceMetadata::new(name, path);
            let workspace = Workspace::new(metadata);
            workspace
        };

        let workspace_path = workspace_path.to_str().unwrap().to_string();
        let f = self.workspaces.iter().find(|w| w.path == workspace_path);
        if f.is_none() {
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

    pub fn save(&self) -> Result<(), WorkspaceError> {
        let config_path = get_workspace_global_config_path();
        let parent = config_path.parent().unwrap();
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|err| WorkspaceError::IOError(err.to_string()))?;
        }
        let s = serde_json::to_string(self)
            .map_err(|err| WorkspaceError::JsonError(err.to_string()))?;
        fs::write(config_path, s).map_err(|err| WorkspaceError::IOError(err.to_string()))?;

        Ok(())
    }
}

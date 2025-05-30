use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use super::{error::WorkspaceError, workspace_path::WorkspacePath};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMetadata {
    pub path: WorkspacePath,
    pub root_path: PathBuf,
    pub name: String,
    pub create_time: Option<u64>,
    pub update_time: Option<u64>,
}

impl WorkspaceMetadata {
    pub fn new(path: &WorkspacePath) -> Result<Self, WorkspaceError> {
        let path_buf = path.to_path_buf_cow();
        let root_path = path_buf
            .parent()
            .ok_or(WorkspaceError::UnknowError(format!(
                "path no parent: {:?}",
                path_buf.as_ref()
            )))?
            .to_path_buf();
        let name = Self::get_file_name(path_buf.as_ref())?;
        Ok(Self {
            root_path,
            name,
            path: path.clone(),
            create_time: None,
            update_time: None,
        })
    }

    pub fn update_time(&mut self, create_time: Option<u64>, update_time: Option<u64>) {
        self.create_time = create_time;
        self.update_time = update_time;
    }

    pub fn get_file_name(path: impl AsRef<Path>) -> Result<String, WorkspaceError> {
        Ok(path
            .as_ref()
            .file_name()
            .map(|f| {
                f.to_str().ok_or(WorkspaceError::UnknowError(format!(
                    "parse file_name error: {f:?}"
                )))
            })
            .unwrap_or(Ok("Unknow"))?
            .to_string())
    }
}

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::utils::time_utils::get_now_timestamp;

use super::error::WorkspaceError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMetadata {
    pub path: PathBuf,
    pub root_path: PathBuf,
    pub name: String,
    pub last_open_time: u64,
}

impl WorkspaceMetadata {
    pub fn new(path: impl AsRef<Path>) -> Result<Self, WorkspaceError> {
        let root_path = path
            .as_ref()
            .parent()
            .ok_or(WorkspaceError::UnknowError(format!(
                "path no parent: {:?}",
                path.as_ref()
            )))?
            .to_path_buf();
        let name = Self::get_file_name(&path)?;
        Ok(Self {
            root_path,
            name,
            path: path.as_ref().to_path_buf(),
            last_open_time: get_now_timestamp(),
        })
    }
    pub fn update_time(&mut self, time: u64) {
        self.last_open_time = time;
    }

    pub fn get_file_name(path: impl AsRef<Path>) -> Result<String, WorkspaceError> {
        Ok(path
            .as_ref()
            .file_name()
            .map(|f| {
                f.to_str().ok_or(WorkspaceError::UnknowError(format!(
                    "parse file_name error: {:?}",
                    f
                )))
            })
            .unwrap_or(Ok("Unknow"))?
            .to_string())
    }
}

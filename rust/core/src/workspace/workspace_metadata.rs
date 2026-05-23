use std::path::Path;

use serde::{Deserialize, Serialize};

use super::{error::WorkspaceError, workspace_path::WorkspacePath};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMetadata {
    #[serde(default = "WorkspaceMetadata::default_id")]
    pub id: String,
    pub path: WorkspacePath,
    pub name: String,
    pub create_time: Option<u64>,
    pub update_time: Option<u64>,
}

impl WorkspaceMetadata {
    pub fn default_id() -> String {
        String::new()
    }

    pub fn new(path: &WorkspacePath, id: impl Into<String>) -> Result<Self, WorkspaceError> {
        let path_buf = path.to_path_buf_cow();
        let name = Self::get_file_name(path_buf.as_ref())?;
        Ok(Self {
            id: id.into(),
            name,
            path: path.clone(),
            create_time: None,
            update_time: None,
        })
    }

    pub fn update_create_time(&mut self, create_time: u64) {
        self.create_time = Some(create_time);
    }

    pub fn update_update_time(&mut self, update_time: u64) {
        self.update_time = Some(update_time);
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

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::utils::time_utils::get_now_timestamp;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMetadata {
    pub path: PathBuf,
    pub name: String,
    pub last_open_time: u64,
}

impl WorkspaceMetadata {
    pub fn new(path: impl AsRef<Path>) -> Self {
        let name = path
            .as_ref()
            .file_name()
            .map(|f| f.to_str().unwrap().to_string())
            .unwrap_or("Unknow".to_string());
        Self {
            name,
            path: path.as_ref().to_path_buf(),
            last_open_time: get_now_timestamp(),
        }
    }
    pub fn update_time(&mut self, time: u64) {
        self.last_open_time = time;
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSaveData {
    pub last_open_file_path: Option<String>,
}

impl WorkspaceSaveData {
    pub fn new() -> Self {
        Self {
            last_open_file_path: None,
        }
    }
}

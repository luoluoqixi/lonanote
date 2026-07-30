use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSaveData {
    /// 上次打开的文件路径
    pub last_open_file_path: Option<String>,
}

impl WorkspaceSaveData {
    pub fn new() -> Self {
        Self {
            last_open_file_path: None,
        }
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSaveData {
    #[serde(default = "WorkspaceSaveData::default_id")]
    pub id: String,
    /// 上次打开的文件路径
    pub last_open_file_path: Option<String>,
}

impl WorkspaceSaveData {
    pub fn default_id() -> String {
        String::new()
    }

    pub fn new(id: impl Into<String>) -> Self {
        Self {
            id: id.into(),
            last_open_file_path: None,
        }
    }

    pub fn ensure_id(&mut self, id: impl AsRef<str>) -> bool {
        let id = id.as_ref();
        if self.id == id {
            return false;
        }
        self.id = id.to_string();
        true
    }
}

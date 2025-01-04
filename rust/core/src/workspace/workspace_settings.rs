use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceSettings {
    pub theme: String,
}

impl WorkspaceSettings {
    pub fn new() -> Self {
        Self {
            theme: "system".to_string(),
        }
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {}

impl WorkspaceSettings {
    pub fn new() -> Self {
        Self {}
    }
}

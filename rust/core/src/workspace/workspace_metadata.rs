use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceMetadata {
    pub name: String,
    pub path: String,
}

impl WorkspaceMetadata {
    pub fn new(name: impl AsRef<str>, path: impl AsRef<str>) -> Self {
        Self {
            name: name.as_ref().to_string(),
            path: path.as_ref().to_string(),
        }
    }
}

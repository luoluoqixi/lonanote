use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::file_metadata::FileMetadata;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceIndex {
    pub files: HashMap<String, FileMetadata>,
}

impl WorkspaceIndex {
    pub fn new() -> Self {
        Self {
            files: HashMap::new(),
        }
    }
}

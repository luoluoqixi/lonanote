use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::file_metadata::FileMetadata;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WorkspaceIndex {
    pub files: HashMap<String, FileMetadata>,
}

impl WorkspaceIndex {
    pub fn new() -> Self {
        Self {
            files: HashMap::new(),
        }
    }

    pub fn add_file(&mut self, path: String, metadata: FileMetadata) {
        self.files.insert(path, metadata);
    }

    pub fn get_file(&self, path: &str) -> Option<&FileMetadata> {
        self.files.get(path)
    }

    pub fn get_files(&self) -> &HashMap<String, FileMetadata> {
        &self.files
    }
}

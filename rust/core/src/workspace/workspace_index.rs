use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use super::{error::WorkspaceError, file_metadata::FileMetadata};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceIndex {
    pub files: HashMap<String, FileMetadata>,

    #[serde(skip)]
    pub workspace_path: PathBuf,
    #[serde(skip)]
    pub indexing: bool,
}

impl WorkspaceIndex {
    pub fn new(workspace_path: impl AsRef<Path>) -> Result<Self, WorkspaceError> {
        Ok(Self {
            files: HashMap::new(),
            workspace_path: workspace_path.as_ref().to_path_buf(),
            indexing: false,
        })
    }

    pub fn start_indexing(&mut self) {
        self.indexing = true;
        log::debug!("start_indexing: {}", self.workspace_path.display());
    }

    pub fn stop_indexing(&mut self) {
        self.indexing = false;
    }
}

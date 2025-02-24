use std::path::PathBuf;

use file_node::FileNode;
use serde::{Deserialize, Serialize};

pub mod file_node;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileTree {
    pub path: String,
    pub children: Vec<FileNode>,
}

impl FileTree {
    pub fn new(path: impl AsRef<str>) -> Self {
        Self {
            path: path.as_ref().to_string(),
            children: Vec::new(),
        }
    }
    pub fn to_path_buf(&self) -> PathBuf {
        PathBuf::from(self.path.as_str())
    }
}

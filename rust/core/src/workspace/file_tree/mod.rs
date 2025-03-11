use std::path::{Path, PathBuf};

use file_node::FileNode;
use serde::{Deserialize, Serialize};

pub mod file_node;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileTree {
    pub path: PathBuf,
    pub children: Option<Vec<FileNode>>,
}

impl FileTree {
    pub fn new(path: impl AsRef<Path>) -> Self {
        Self {
            path: path.as_ref().to_path_buf(),
            children: None,
        }
    }
    pub fn update_tree(&mut self) -> Result<(), String> {
        let new_root = FileNode::from_path(&self.path)?;
        self.children = new_root.children;

        Ok(())
    }
    pub fn to_path_buf(&self) -> PathBuf {
        self.path.to_path_buf()
    }
}

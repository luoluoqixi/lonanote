use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

mod file_node;
mod file_tree_sort_type;
mod file_type;

pub use file_node::*;
pub use file_tree_sort_type::*;
pub use file_type::*;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileTree {
    pub path: PathBuf,
    pub children: Option<Vec<FileNode>>,
    pub sort_type: FileTreeSortType,
}

impl FileTree {
    pub fn new(path: impl AsRef<Path>, sort_type: Option<FileTreeSortType>) -> Self {
        Self {
            path: path.as_ref().to_path_buf(),
            children: None,
            sort_type: sort_type.unwrap_or_default(),
        }
    }
    pub fn update_tree(&mut self) -> Result<(), String> {
        let new_root = FileNode::from_path(&self.path)?;
        self.children = new_root.children;
        self.sort();

        Ok(())
    }
    pub fn set_sort_type(&mut self, sort_type: FileTreeSortType) {
        self.sort_type = sort_type;
        self.sort();
    }
    pub fn sort(&mut self) {
        let sort_type = self.sort_type.clone();
        if let Some(children) = &mut self.children {}
    }
    pub fn to_path_buf(&self) -> PathBuf {
        self.path.to_path_buf()
    }
}

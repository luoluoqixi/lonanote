use serde::{Deserialize, Serialize};
use std::path::Path;

use super::{
    error::WorkspaceError,
    file_tree::{file_node::FileNode, FileTree},
};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceIndex {
    pub file_tree: FileTree,
}

impl WorkspaceIndex {
    pub fn new(workspace_path: impl AsRef<Path>) -> Result<Self, WorkspaceError> {
        Ok(Self {
            file_tree: FileTree::new(workspace_path.as_ref().to_str().unwrap()),
        })
    }

    pub fn reinit(&mut self) -> Result<(), String> {
        let root_path = self.file_tree.to_path_buf();
        log::info!("workspace reinit: {}", root_path.display());
        let new_root = FileNode::from_path(&root_path)?;
        self.file_tree.children = new_root.children.unwrap_or_default();
        log::info!("workspace reinit finish");

        Ok(())
    }
}

use serde::{Deserialize, Serialize};

use super::{
    error::WorkspaceError,
    file_tree::{FileTree, FileTreeSortType},
    workspace_path::WorkspacePath,
};

#[derive(Default, Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceIndex {
    pub file_tree: FileTree,
}

impl WorkspaceIndex {
    pub fn new(
        workspace_path: &WorkspacePath,
        sort_type: FileTreeSortType,
    ) -> Result<Self, WorkspaceError> {
        Ok(Self {
            file_tree: FileTree::new(workspace_path.to_path_buf(), sort_type),
        })
    }

    pub fn reinit(
        &mut self,
        sort_type: FileTreeSortType,
        follow_gitignore: bool,
        custom_ignore: String,
    ) -> Result<(), String> {
        self.file_tree.set_sort_type(sort_type);
        let root_path = self.file_tree.to_path_buf();
        let start = std::time::Instant::now();
        log::info!("workspace reinit: {}", root_path.display());
        self.file_tree
            .update_tree(follow_gitignore, custom_ignore)?;
        log::info!(
            "workspace reinit finish: {:?}ms",
            start.elapsed().as_millis()
        );

        Ok(())
    }
}

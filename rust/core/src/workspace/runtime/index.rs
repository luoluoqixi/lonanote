use std::path::PathBuf;

use tokio::sync::RwLock;

use crate::workspace::{
    domain::{WorkspaceRelativePath, WorkspaceSettings},
    error::WorkspaceError,
    file_tree::{FileNode, FileTree},
};

#[derive(Debug)]
pub struct WorkspaceIndex {
    native_root: Option<PathBuf>,
    cached_tree: RwLock<Option<FileTree>>,
}

impl WorkspaceIndex {
    pub fn new(native_root: Option<PathBuf>) -> Self {
        Self {
            native_root,
            cached_tree: RwLock::new(None),
        }
    }

    pub async fn get_tree(
        &self,
        settings: &WorkspaceSettings,
        recursive: bool,
    ) -> Result<FileTree, WorkspaceError> {
        if recursive {
            if let Some(tree) = self.cached_tree.read().await.clone() {
                if tree.sort_type == settings.file_tree_sort_type {
                    return Ok(tree);
                }
            }
        }
        let tree = self.build_tree(settings, recursive)?;
        if recursive {
            *self.cached_tree.write().await = Some(tree.clone());
        }
        Ok(tree)
    }

    pub async fn get_node(
        &self,
        path: &WorkspaceRelativePath,
        settings: &WorkspaceSettings,
        recursive: bool,
    ) -> Result<FileNode, WorkspaceError> {
        let root = self
            .native_root
            .as_ref()
            .ok_or(WorkspaceError::FileTreeUnavailable)?;
        let tree = FileTree::new(root, settings.file_tree_sort_type);
        let path = (!path.is_root()).then(|| path.as_str().to_string());
        let mut node = tree
            .get_node(
                path.as_ref(),
                settings.follow_gitignore,
                settings.custom_ignore.clone(),
                recursive,
                settings.file_tree_sort_type,
            )
            .map_err(WorkspaceError::InvalidManifest)?;
        if let Some(prefix) = path.as_deref() {
            prefix_node_paths(&mut node, prefix);
        }
        Ok(node)
    }

    pub async fn refresh(&self, settings: &WorkspaceSettings) -> Result<(), WorkspaceError> {
        let tree = self.build_tree(settings, true)?;
        *self.cached_tree.write().await = Some(tree);
        Ok(())
    }

    pub async fn invalidate(&self) {
        *self.cached_tree.write().await = None;
    }

    fn build_tree(
        &self,
        settings: &WorkspaceSettings,
        recursive: bool,
    ) -> Result<FileTree, WorkspaceError> {
        let root = self
            .native_root
            .as_ref()
            .ok_or(WorkspaceError::FileTreeUnavailable)?;
        let mut tree = FileTree::new(root, settings.file_tree_sort_type);
        tree.update_tree(
            settings.follow_gitignore,
            settings.custom_ignore.clone(),
            recursive,
        )
        .map_err(WorkspaceError::InvalidManifest)?;
        Ok(tree)
    }
}

/// 旧 FileTree 以查询目标作为临时 root，会让返回路径从空字符串重新开始。
/// WorkspaceIndex 在边界处恢复为 Workspace-relative path，避免该过渡细节泄漏给 API。
fn prefix_node_paths(node: &mut FileNode, prefix: &str) {
    let current = node.path.as_str();
    node.path = relative_path::RelativePathBuf::from(if current.is_empty() {
        prefix.to_string()
    } else {
        format!("{prefix}/{current}")
    });
    if let Some(children) = node.children.as_mut() {
        for child in children {
            prefix_node_paths(child, prefix);
        }
    }
}

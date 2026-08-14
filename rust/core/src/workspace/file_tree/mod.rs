use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

mod file_node;
mod file_tree_sort;
mod file_type;

pub use file_node::*;
pub use file_tree_sort::*;
pub use file_type::*;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileTree {
    #[serde(skip)]
    pub path: PathBuf,
    pub root: Option<FileNode>,
}

impl FileTree {
    pub fn new(path: impl AsRef<Path>) -> Self {
        Self {
            path: path.as_ref().to_path_buf(),
            root: None,
        }
    }
    pub fn update_tree(
        &mut self,
        follow_gitignore: bool,
        custom_ignore: String,
        recursive: bool,
    ) -> Result<(), String> {
        self.root.replace(FileNode::from_path(
            &self.path,
            follow_gitignore,
            custom_ignore,
            recursive,
        )?);
        self.sort();

        Ok(())
    }
    pub fn sort(&mut self) {
        if let Some(root) = &mut self.root {
            // let start = std::time::Instant::now();
            let mut stack = vec![root];
            while let Some(node) = stack.pop() {
                if let Some(children) = node.children.as_mut() {
                    children.sort_by(file_tree_compare);
                    stack.extend(children.iter_mut());
                }
            }
            // log::info!("sort tree: {:?}ms", start.elapsed().as_millis());
        }
    }
    pub fn to_path_buf(&self) -> PathBuf {
        self.path.to_path_buf()
    }

    pub fn get_node(
        &self,
        path: Option<&String>,
        follow_gitignore: bool,
        custom_ignore: String,
        recursive: bool,
    ) -> Result<FileNode, String> {
        let path = if let Some(s) = path {
            &self.path.join(s)
        } else {
            &self.path
        };
        let mut node = FileNode::from_path(path, follow_gitignore, custom_ignore, recursive)?;
        if let Some(children) = &mut node.children {
            children.sort_by(file_tree_compare);
        }
        Ok(node)
    }
}

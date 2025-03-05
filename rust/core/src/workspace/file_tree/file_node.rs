use std::{collections::HashMap, path::Path, time::UNIX_EPOCH};

use relative_path::RelativePathBuf;
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

#[derive(Default, Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum FileType {
    #[default]
    File,
    Directory,
}

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub path: RelativePathBuf,
    pub file_type: FileType,
    pub children: Option<Vec<FileNode>>,

    pub last_modified: Option<u64>,
    pub size: Option<u64>,
}

impl FileNode {
    pub fn from_path(root: &Path) -> Result<Self, String> {
        let mut nodes: HashMap<RelativePathBuf, FileNode> = HashMap::new();
        let mut root_node = None;

        for entry in WalkDir::new(root) {
            let entry = entry.map_err(|err| format!("error walking directory: {}", err))?;
            let metadata = entry
                .metadata()
                .map_err(|err| format!("error reading metadata: {}", err))?;
            let path = entry.path();

            let relative_path: RelativePathBuf = path
                .strip_prefix(root)
                .map_err(|err| format!("failed to create relative path: {:?}, {}", path, err))?
                .to_string_lossy()
                .to_string()
                .into();

            let file_type = if metadata.is_dir() {
                FileType::Directory
            } else {
                FileType::File
            };

            let is_file = file_type == FileType::File;
            let is_dir = file_type == FileType::Directory;

            let last_modified = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|dur| dur.as_secs());

            let size = if is_file { Some(metadata.len()) } else { None };

            let node = FileNode {
                path: relative_path.clone(),
                file_type,
                children: if is_dir { Some(vec![]) } else { None },
                last_modified,
                size,
            };

            if relative_path.as_str().is_empty() {
                root_node = Some(node);
            } else {
                nodes.insert(relative_path.clone(), node);
            }
        }

        let mut relations = Vec::new();
        for (path, _) in nodes.iter() {
            if let Some(parent) = Path::new(path.as_str()).parent() {
                let parent_path = RelativePathBuf::from(parent.to_string_lossy().to_string());
                relations.push((path.clone(), parent_path));
            }
        }

        for (child_path, parent_path) in relations {
            if nodes.contains_key(&parent_path) {
                let node = nodes.get(&child_path).cloned();
                if let Some(parent_node) = nodes.get_mut(&parent_path) {
                    if let Some(child_node) = node {
                        parent_node
                            .children
                            .get_or_insert_with(Vec::new)
                            .push(child_node);
                    }
                }
            }
        }

        let mut root = root_node.ok_or("root directory not found")?;
        let mut top_level_nodes = Vec::new();
        for (path, node) in nodes {
            if Path::new(path.as_str())
                .parent()
                .is_none_or(|p| p.as_os_str().is_empty())
            {
                top_level_nodes.push(node);
            }
        }

        root.children = Some(top_level_nodes);
        Ok(root)
    }

    // pub fn to_path_buf(&self, root: &Path) -> PathBuf {
    //     root.join(self.path.as_str())
    // }
}

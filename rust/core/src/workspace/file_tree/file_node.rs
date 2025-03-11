use std::{path::Path, time::UNIX_EPOCH};

use relative_path::RelativePathBuf;
use serde::{Deserialize, Serialize};
use walkdir::{DirEntry, WalkDir};

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
    pub last_modified: Option<u64>,
    pub size: Option<u64>,
    pub count: Option<usize>,
    pub children: Option<Vec<FileNode>>,
}

impl FileNode {
    fn new_node(root: &Path, entry: DirEntry) -> Result<FileNode, String> {
        let metadata = entry
            .metadata()
            .map_err(|err| format!("error reading metadata: {}", err))?;
        let path = entry.path();

        let relative_path = RelativePathBuf::from_path(
            path.strip_prefix(root)
                .map_err(|err| format!("failed to create relative path: {:?}, {}", path, err))?,
        )
        .map_err(|err| {
            format!(
                "convert to RelativePathBuf Error: path: {} >> root: {}, error: {}",
                path.display(),
                root.display(),
                err
            )
        })?;

        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else {
            FileType::File
        };

        let is_file = file_type == FileType::File;

        let last_modified = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|dur| dur.as_secs());

        let size = if is_file { Some(metadata.len()) } else { None };

        Ok(FileNode {
            path: relative_path,
            file_type,
            children: None,
            last_modified,
            size,
            count: None,
        })
    }

    pub fn from_path(root: &Path) -> Result<Self, String> {
        let mut dir_iter = WalkDir::new(root).into_iter();
        let root_entry = dir_iter.next();
        match root_entry {
            Some(root_entry) => {
                let root_entry =
                    root_entry.map_err(|err| format!("error walking root directory: {}", err))?;
                let root_node = Self::new_node(root, root_entry)?;

                let mut stack: Vec<&FileNode> = vec![&root_node];

                for entry in dir_iter {
                    let entry = entry.map_err(|err| format!("error walking directory: {}", err))?;
                    let depth = entry.depth();
                    let node = Self::new_node(root, entry)?;

                    while stack.len() > depth {
                        stack.pop();
                    }

                    if let Some(&parent) = stack.last() {
                        // parent.children.get_or_insert_with(Vec::new).push(node);
                        let mut_parent =
                            unsafe { (parent as *const FileNode as *mut FileNode).as_mut() }
                                .unwrap();
                        mut_parent.children.get_or_insert_with(Vec::new).push(node);

                        let node_ref = parent.children.as_ref().unwrap().last().unwrap();
                        stack.push(node_ref);
                    }
                }

                Ok(root_node)
            }
            None => Err(format!("root node notfound: {}", root.display())),
        }
    }
    // pub fn to_path_buf(&self, root: &Path) -> PathBuf {
    //     root.join(self.path.as_str())
    // }
}

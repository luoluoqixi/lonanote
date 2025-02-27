use std::{path::Path, time::UNIX_EPOCH};

use relative_path::RelativePathBuf;
use serde::{Deserialize, Serialize};
use walkdir::WalkDir;

#[derive(Default, Serialize, Deserialize, Debug, Clone)]
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
    pub fn from_path(root: &Path, path: &Path) -> Result<Self, String> {
        let metadata =
            std::fs::metadata(path).map_err(|err| format!("Error reading metadata: {}", err))?;
        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else {
            FileType::File
        };

        let last_modified = metadata
            .modified()
            .ok()
            .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
            .map(|dur| dur.as_secs());

        let size = match file_type {
            FileType::File => Some(metadata.len()),
            FileType::Directory => None,
        };

        let relative_path = path
            .strip_prefix(root)
            .map_err(|_| format!("Failed to create relative path: {:?}", path))?
            .to_string_lossy()
            .to_string()
            .into();

        let children = match file_type {
            FileType::File => None,
            FileType::Directory => {
                let mut sub_children = Vec::new();
                for entry in WalkDir::new(path).min_depth(1).max_depth(1).into_iter() {
                    let entry = entry.map_err(|err| format!("Error walking directory: {}", err))?;
                    sub_children.push(FileNode::from_path(root, entry.path())?);
                }
                Some(sub_children)
            }
        };

        Ok(Self {
            path: relative_path,
            file_type,
            children,
            last_modified,
            size,
        })
    }

    // pub fn to_path_buf(&self, root: &Path) -> PathBuf {
    //     root.join(self.path.as_str())
    // }
}

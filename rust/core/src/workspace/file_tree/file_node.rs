use std::time::UNIX_EPOCH;

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
    pub path: String,
    pub file_type: FileType,
    pub children: Option<Vec<FileNode>>,

    pub last_modified: Option<u64>,
    pub size: Option<u64>,
}

impl FileNode {
    pub fn from_path(path: &str) -> Result<Self, String> {
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

        let children = match file_type {
            FileType::File => None,
            FileType::Directory => {
                let mut sub_children = Vec::new();
                for entry in WalkDir::new(path).min_depth(1).max_depth(1).into_iter() {
                    let entry = entry.map_err(|err| format!("Error walking directory: {}", err))?;
                    sub_children.push(FileNode::from_path(&entry.path().to_string_lossy())?);
                }
                Some(sub_children)
            }
        };

        Ok(Self {
            path: path.to_string(),
            file_type,
            children,
            last_modified,
            size,
        })
    }

    // pub fn to_path_buf(&self) -> PathBuf {
    //     PathBuf::from(self.path.as_str())
    // }
}

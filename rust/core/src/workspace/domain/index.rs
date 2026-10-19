use super::WorkspaceRelativePath;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FileType {
    File,
    Directory,
}

/// 目录中的直接节点，不含未加载后代或递归计数。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceIndexEntry {
    pub path: WorkspaceRelativePath,
    pub file_type: FileType,
    pub last_modified_time: Option<u64>,
    pub create_time: Option<u64>,
    pub size: Option<u64>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDirectorySnapshot {
    pub path: WorkspaceRelativePath,
    pub entries: Vec<WorkspaceIndexEntry>,
}

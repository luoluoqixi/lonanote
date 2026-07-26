use serde::{Deserialize, Serialize};

use super::FileTreeSortType;
use crate::workspace::{
    storage::{StorageEntryKind, StorageEntryMetadata},
    workspace_relative_path::WorkspaceRelativePath,
};

/// 与具体 storage provider 无关的 Workspace 文件节点。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    /// Workspace 内的逻辑相对路径，根目录使用空字符串。
    pub path: WorkspaceRelativePath,
    pub kind: StorageEntryKind,
    pub size: Option<u64>,
    pub created_time: Option<u64>,
    pub modified_time: Option<u64>,
    /// 当前已加载子树中的文件数量。
    pub file_count: usize,
    /// 当前已加载子树中的目录数量。
    pub directory_count: usize,
    /// `None` 表示目录尚未展开，`Some([])` 表示已展开且为空。
    pub children: Option<Vec<FileNode>>,
}

impl FileNode {
    pub(crate) fn from_metadata(
        path: WorkspaceRelativePath,
        metadata: StorageEntryMetadata,
    ) -> Self {
        Self {
            path,
            kind: metadata.kind,
            size: metadata.size,
            created_time: metadata.created_time,
            modified_time: metadata.modified_time,
            file_count: 0,
            directory_count: 0,
            children: None,
        }
    }

    pub fn is_directory(&self) -> bool {
        self.kind == StorageEntryKind::Directory
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTree {
    pub root: FileNode,
    pub sort_type: FileTreeSortType,
    /// `true` 表示所有可见目录均已递归展开。
    pub recursive: bool,
}

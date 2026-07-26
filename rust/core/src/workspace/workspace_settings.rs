use serde::{Deserialize, Serialize};

use super::{file_tree::FileTreeSortType, workspace_relative_path::WorkspaceRelativePath};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    /// 文件树排序类型。
    #[serde(default = "WorkspaceSettings::default_file_tree_sort_type")]
    pub file_tree_sort_type: FileTreeSortType,
    /// 遍历文件时是否使用 `.gitignore`。
    #[serde(default = "WorkspaceSettings::default_follow_gitignore")]
    pub follow_gitignore: bool,
    /// 自定义忽略规则。
    #[serde(default = "WorkspaceSettings::default_custom_ignore")]
    pub custom_ignore: String,
    /// 上传图片的 Workspace 相对路径。
    #[serde(default = "WorkspaceSettings::default_upload_image_path")]
    pub upload_image_path: WorkspaceRelativePath,
    /// 上传附件的 Workspace 相对路径。
    #[serde(default = "WorkspaceSettings::default_upload_attachment_path")]
    pub upload_attachment_path: WorkspaceRelativePath,
    /// 历史快照数量。
    #[serde(default = "WorkspaceSettings::default_histroy_snapshoot_count")]
    pub histroy_snapshoot_count: usize,
}

impl WorkspaceSettings {
    pub const fn default_file_tree_sort_type() -> FileTreeSortType {
        FileTreeSortType::Name
    }

    pub const fn default_follow_gitignore() -> bool {
        true
    }

    pub fn default_custom_ignore() -> String {
        DEFAULT_IGNORE.to_string()
    }

    pub fn default_upload_image_path() -> WorkspaceRelativePath {
        WorkspaceRelativePath::parse("assets/images").expect("静态图片上传路径必须合法")
    }

    pub fn default_upload_attachment_path() -> WorkspaceRelativePath {
        WorkspaceRelativePath::parse("assets/attachments").expect("静态附件上传路径必须合法")
    }

    pub const fn default_histroy_snapshoot_count() -> usize {
        20
    }
}

impl Default for WorkspaceSettings {
    fn default() -> Self {
        Self {
            file_tree_sort_type: Self::default_file_tree_sort_type(),
            follow_gitignore: Self::default_follow_gitignore(),
            custom_ignore: Self::default_custom_ignore(),
            upload_image_path: Self::default_upload_image_path(),
            upload_attachment_path: Self::default_upload_attachment_path(),
            histroy_snapshoot_count: Self::default_histroy_snapshoot_count(),
        }
    }
}

pub static DEFAULT_IGNORE: &str = include_str!("../../assets/default_ignore.txt");

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::{StorageProviderId, WorkspaceRelativePath};

pub const WORKSPACE_SETTINGS_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_SETTINGS_PATH: &str = ".lonanote/settings.json";

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSyncSettings {
    pub provider_id: Option<StorageProviderId>,
    #[serde(default, flatten)]
    pub options: BTreeMap<String, Value>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FileTreeSortType {
    #[default]
    Name,
    NameRev,
    LastModifiedTime,
    LastModifiedTimeRev,
    CreateTime,
    CreateTimeRev,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    pub schema_version: u32,
    #[serde(default)]
    pub file_tree_sort_type: FileTreeSortType,
    #[serde(default = "default_true")]
    pub follow_gitignore: bool,
    #[serde(default = "default_custom_ignore")]
    pub custom_ignore: String,
    #[serde(default = "default_upload_image_path")]
    pub upload_image_path: WorkspaceRelativePath,
    #[serde(default = "default_upload_attachment_path")]
    pub upload_attachment_path: WorkspaceRelativePath,
    #[serde(default = "default_history_snapshot_count")]
    pub history_snapshot_count: usize,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sync: Option<WorkspaceSyncSettings>,
}

impl Default for WorkspaceSettings {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_SETTINGS_SCHEMA_VERSION,
            file_tree_sort_type: FileTreeSortType::Name,
            follow_gitignore: true,
            custom_ignore: default_custom_ignore(),
            upload_image_path: default_upload_image_path(),
            upload_attachment_path: default_upload_attachment_path(),
            history_snapshot_count: default_history_snapshot_count(),
            sync: None,
        }
    }
}

const fn default_true() -> bool {
    true
}

fn default_custom_ignore() -> String {
    include_str!("../../../assets/default_ignore.txt").to_string()
}

fn default_upload_image_path() -> WorkspaceRelativePath {
    WorkspaceRelativePath::parse("assets/images")
        .expect("默认图片上传路径必须是合法 WorkspaceRelativePath")
}

fn default_upload_attachment_path() -> WorkspaceRelativePath {
    WorkspaceRelativePath::parse("assets/attachments")
        .expect("默认附件上传路径必须是合法 WorkspaceRelativePath")
}

const fn default_history_snapshot_count() -> usize {
    20
}

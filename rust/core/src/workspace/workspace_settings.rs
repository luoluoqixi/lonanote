use serde::{Deserialize, Serialize};

use super::{
    config::{from_json_config, save_json_config, WORKSPACE_SETTINGS_FILE},
    error::WorkspaceError,
    file_tree::FileTreeSortType,
    workspace_path::WorkspacePath,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    #[serde(skip)]
    pub workspace_path: WorkspacePath,
    /// 创建时间
    #[serde(default = "WorkspaceSettings::default_create_time")]
    pub create_time: Option<u64>,
    /// 文件树排序类型
    #[serde(default = "WorkspaceSettings::default_file_tree_sort_type")]
    pub file_tree_sort_type: FileTreeSortType,
    /// 遍历文件时自动使用.gitignore忽略规则
    #[serde(default = "WorkspaceSettings::default_follow_gitignore")]
    pub follow_gitignore: bool,
    /// 自定义的忽略规则
    #[serde(default = "WorkspaceSettings::default_custom_ignore")]
    pub custom_ignore: String,
    /// 上传图片路径
    #[serde(default = "WorkspaceSettings::default_upload_image_path")]
    pub upload_image_path: String,
    /// 上传附件路径
    #[serde(default = "WorkspaceSettings::default_upload_attachment_path")]
    pub upload_attachment_path: String,
    /// 历史快照数量
    #[serde(default = "WorkspaceSettings::default_histroy_snapshoot_count")]
    pub histroy_snapshoot_count: usize,
}

impl WorkspaceSettings {
    pub fn default_create_time() -> Option<u64> {
        None
    }

    pub const fn default_file_tree_sort_type() -> FileTreeSortType {
        FileTreeSortType::Name
    }

    pub const fn default_follow_gitignore() -> bool {
        true
    }

    pub fn default_custom_ignore() -> String {
        DEFAULT_IGNORE.to_string()
    }

    pub fn default_upload_image_path() -> String {
        String::from("assets/images")
    }

    pub fn default_upload_attachment_path() -> String {
        String::from("assets/attachments")
    }
    pub const fn default_histroy_snapshoot_count() -> usize {
        20
    }
}

pub static DEFAULT_IGNORE: &str = include_str!("../../assets/default_ignore.txt");

impl WorkspaceSettings {
    pub fn new(workspace_path: &WorkspacePath) -> Result<Self, WorkspaceError> {
        let config = from_json_config::<Self>(workspace_path, WORKSPACE_SETTINGS_FILE)?;
        if let Some(mut config) = config {
            config.workspace_path = workspace_path.clone();
            Ok(config)
        } else {
            Ok(Self {
                workspace_path: workspace_path.clone(),
                create_time: WorkspaceSettings::default_create_time(),
                file_tree_sort_type: WorkspaceSettings::default_file_tree_sort_type(),
                follow_gitignore: WorkspaceSettings::default_follow_gitignore(),
                custom_ignore: WorkspaceSettings::default_custom_ignore(),
                upload_image_path: WorkspaceSettings::default_upload_image_path(),
                upload_attachment_path: WorkspaceSettings::default_upload_attachment_path(),
                histroy_snapshoot_count: WorkspaceSettings::default_histroy_snapshoot_count(),
            })
        }
    }

    pub async fn update_create_time(&mut self, time: u64) -> Result<(), WorkspaceError> {
        self.create_time.replace(time);
        self.save().await
    }

    pub async fn save(&self) -> Result<(), WorkspaceError> {
        save_json_config(&self.workspace_path, WORKSPACE_SETTINGS_FILE, self)?;

        Ok(())
    }
}

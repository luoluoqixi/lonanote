use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use super::{
    config::{from_json_config, save_json_config, WORKSPACE_SETTINGS_FILE},
    error::WorkspaceError,
    file_tree::FileTreeSortType,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    #[serde(skip)]
    pub workspace_path: PathBuf,
    /// 文件树排序类型
    pub file_tree_sort_type: Option<FileTreeSortType>,
    /// 遍历文件时自动使用.gitignore忽略规则
    pub follow_gitignore: bool,
    /// 自定义的忽略规则
    pub custom_ignore: String,
}

pub static DEFAULT_IGNORE: &str = r"
# lonanote
.lonanote

# OSX
**/*.DS_Store
";

impl WorkspaceSettings {
    pub fn new(workspace_path: impl AsRef<Path>) -> Result<Self, WorkspaceError> {
        let config = from_json_config::<Self>(&workspace_path, WORKSPACE_SETTINGS_FILE)?;
        if let Some(mut config) = config {
            config.workspace_path = workspace_path.as_ref().to_path_buf();
            Ok(config)
        } else {
            Ok(Self {
                workspace_path: workspace_path.as_ref().to_path_buf(),
                file_tree_sort_type: None,
                follow_gitignore: true,
                custom_ignore: DEFAULT_IGNORE.to_string(),
            })
        }
    }

    pub async fn save(&self) -> Result<(), WorkspaceError> {
        save_json_config(&self.workspace_path, WORKSPACE_SETTINGS_FILE, self)?;

        Ok(())
    }
}

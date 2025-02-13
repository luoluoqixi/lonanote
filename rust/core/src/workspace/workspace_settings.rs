use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

use super::{
    config::{from_json_config, save_json_config, WORKSPACE_SETTINGS_FILE},
    error::WorkspaceError,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettings {
    #[serde(skip)]
    pub workspace_path: PathBuf,
}

impl WorkspaceSettings {
    pub fn new(workspace_path: impl AsRef<Path>) -> Result<Self, WorkspaceError> {
        let config = from_json_config::<Self>(&workspace_path, WORKSPACE_SETTINGS_FILE)?;
        if let Some(mut config) = config {
            config.workspace_path = workspace_path.as_ref().to_path_buf();
            Ok(config)
        } else {
            Ok(Self {
                workspace_path: workspace_path.as_ref().to_path_buf(),
            })
        }
    }

    pub async fn save(&self) -> Result<(), WorkspaceError> {
        save_json_config(&self.workspace_path, WORKSPACE_SETTINGS_FILE, self)?;

        Ok(())
    }
}

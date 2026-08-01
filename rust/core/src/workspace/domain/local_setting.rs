use serde::{Deserialize, Serialize};

use super::WorkspaceRelativePath;

pub const WORKSPACE_LOCAL_SETTING_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_LOCAL_SETTING_PATH: &str = ".lonanote/settings.local.json";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceLocalSetting {
    pub schema_version: u32,
    pub last_opened_at: Option<u64>,
    pub last_open_file: Option<WorkspaceRelativePath>,
}

impl Default for WorkspaceLocalSetting {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_LOCAL_SETTING_SCHEMA_VERSION,
            last_opened_at: None,
            last_open_file: None,
        }
    }
}

use serde::{Deserialize, Serialize};

use crate::workspace::error::WorkspaceManifestError;

use super::WorkspaceId;

pub const WORKSPACE_MANIFEST_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_MANIFEST_PATH: &str = ".lonanote/manifest.json";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceManifest {
    pub schema_version: u32,
    pub id: WorkspaceId,
    pub display_name: String,
    pub created_at: u64,
}

impl WorkspaceManifest {
    pub fn new(id: WorkspaceId, display_name: String, created_at: u64) -> Self {
        Self {
            schema_version: WORKSPACE_MANIFEST_SCHEMA_VERSION,
            id,
            display_name,
            created_at,
        }
    }

    pub fn validate(&self) -> Result<(), WorkspaceManifestError> {
        if self.schema_version != WORKSPACE_MANIFEST_SCHEMA_VERSION {
            return Err(WorkspaceManifestError::UnsupportedSchema(
                self.schema_version,
            ));
        }
        if self.display_name.trim().is_empty() || self.display_name.chars().any(char::is_control) {
            return Err(WorkspaceManifestError::InvalidDisplayName);
        }
        Ok(())
    }
}

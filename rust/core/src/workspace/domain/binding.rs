use serde::{Deserialize, Serialize};

use crate::workspace::error::WorkspaceManifestError;

use super::{StorageProviderId, WorkspaceDirectoryName};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum WorkspaceStorageBinding {
    Managed {
        provider_id: StorageProviderId,
        directory_name: WorkspaceDirectoryName,
    },
    External {
        provider_id: StorageProviderId,
        resource_ref: String,
    },
}

impl WorkspaceStorageBinding {
    pub fn provider_id(&self) -> &StorageProviderId {
        match self {
            Self::Managed { provider_id, .. } | Self::External { provider_id, .. } => provider_id,
        }
    }

    pub fn validate(&self) -> Result<(), WorkspaceManifestError> {
        if let Self::External { resource_ref, .. } = self {
            if resource_ref.trim().is_empty() || resource_ref.chars().any(char::is_control) {
                return Err(WorkspaceManifestError::InvalidStorageBinding);
            }
        }
        Ok(())
    }

    pub fn is_managed(&self) -> bool {
        matches!(self, Self::Managed { .. })
    }
}

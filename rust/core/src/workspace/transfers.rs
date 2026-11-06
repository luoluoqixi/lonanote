use super::{StorageEntryMetadata, WorkspaceRelativePath};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TransferOperation {
    Move,
    Copy,
}
#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TransferConflictPolicy {
    KeepBoth,
    Overwrite,
    Skip,
    Error,
}
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferSource {
    pub path: WorkspaceRelativePath,
    pub expected_metadata: Option<StorageEntryMetadata>,
}
#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TransferStatus {
    Succeeded,
    Skipped,
    Failed,
}
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferEntryResult {
    pub source_path: WorkspaceRelativePath,
    pub target_path: Option<WorkspaceRelativePath>,
    pub status: TransferStatus,
    pub error: Option<String>,
    pub cleanup_error: Option<String>,
}

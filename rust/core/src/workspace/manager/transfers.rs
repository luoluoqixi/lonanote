use super::*;
use crate::workspace::{
    TransferConflictPolicy, TransferEntryResult, TransferOperation, TransferSource,
};

impl WorkspaceManager {
    pub async fn transfer_entries(
        &self,
        id: &WorkspaceId,
        sources: Vec<TransferSource>,
        destination: WorkspaceRelativePath,
        operation: TransferOperation,
        conflict_policy: TransferConflictPolicy,
    ) -> Result<Vec<TransferEntryResult>, WorkspaceError> {
        self.transfer_entries_protected(
            id,
            sources,
            destination,
            operation,
            conflict_policy,
            Vec::new(),
        )
        .await
    }
    pub async fn transfer_entries_protected(
        &self,
        id: &WorkspaceId,
        sources: Vec<TransferSource>,
        destination: WorkspaceRelativePath,
        operation: TransferOperation,
        conflict_policy: TransferConflictPolicy,
        protected_paths: Vec<WorkspaceRelativePath>,
    ) -> Result<Vec<TransferEntryResult>, WorkspaceError> {
        let _lifecycle = self.lifecycle_lock.read().await;
        self.get_open_instance(id)
            .await?
            .transfer_entries(
                sources,
                destination,
                operation,
                conflict_policy,
                protected_paths,
            )
            .await
    }
}

pub mod config;
pub mod error;
pub mod file_metadata;
pub mod workspace;
pub mod workspace_index;
pub mod workspace_manager;
pub mod workspace_metadata;
pub mod workspace_settings;

use std::sync::{Arc, LazyLock};
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use workspace_manager::WorkspaceManager;

static WORKSPACE_MANAGER: LazyLock<Arc<RwLock<WorkspaceManager>>> =
    LazyLock::new(|| Arc::new(RwLock::new(WorkspaceManager::new())));

pub async fn get_workspace_manager() -> RwLockReadGuard<'static, WorkspaceManager> {
    WORKSPACE_MANAGER.read().await
}

pub async fn get_workspace_manager_mut() -> RwLockWriteGuard<'static, WorkspaceManager> {
    WORKSPACE_MANAGER.write().await
}

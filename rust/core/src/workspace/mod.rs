pub mod error;
pub mod file_tree;
pub mod storage;

mod domain;
mod manager;
mod persistence;
mod runtime;

use std::sync::OnceLock;

use thiserror::Error;

pub use domain::*;
pub use error::*;
pub use manager::{
    WorkspaceManager, INITIAL_WORKSPACE_DISPLAY_NAME_CN, INITIAL_WORKSPACE_DISPLAY_NAME_EN,
};
pub use persistence::{
    WorkspaceCatalog, WorkspaceCatalogData, WorkspaceSessionData, WorkspaceSessionStore,
};
pub use runtime::{WorkspaceInstance, WorkspaceRuntime};
pub use storage::*;

static WORKSPACE_MANAGER: OnceLock<WorkspaceManager> = OnceLock::new();

pub fn install_workspace_manager(
    manager: WorkspaceManager,
) -> Result<(), WorkspaceManagerInstallError> {
    WORKSPACE_MANAGER
        .set(manager)
        .map_err(|_| WorkspaceManagerInstallError::AlreadyInstalled)
}

pub fn workspace_manager() -> &'static WorkspaceManager {
    WORKSPACE_MANAGER
        .get()
        .expect("WorkspaceManager 尚未初始化")
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum WorkspaceManagerInstallError {
    #[error("WorkspaceManager 已安装")]
    AlreadyInstalled,
}

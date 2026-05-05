pub mod config;
pub mod error;
pub mod file_tree;
pub mod workspace_index;
pub mod workspace_instance;
pub mod workspace_locator;
pub mod workspace_metadata;
pub mod workspace_path;
pub mod workspace_registry;
pub mod workspace_runtime;
pub mod workspace_savedata;
pub mod workspace_settings;

#[cfg(test)]
mod tests;

use std::sync::{Arc, LazyLock};
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use workspace_registry::WorkspaceRegistry;
use workspace_runtime::WorkspaceRuntime;

pub static WORKSPACE_REGISTRY: LazyLock<Arc<RwLock<WorkspaceRegistry>>> =
    LazyLock::new(|| Arc::new(RwLock::new(WorkspaceRegistry::new())));

pub static WORKSPACE_RUNTIME: LazyLock<Arc<RwLock<WorkspaceRuntime>>> =
    LazyLock::new(|| Arc::new(RwLock::new(WorkspaceRuntime::new())));

pub async fn get_workspace_registry() -> RwLockReadGuard<'static, WorkspaceRegistry> {
    WORKSPACE_REGISTRY.read().await
}

pub async fn get_workspace_registry_mut() -> RwLockWriteGuard<'static, WorkspaceRegistry> {
    WORKSPACE_REGISTRY.write().await
}

pub async fn get_workspace_runtime() -> RwLockReadGuard<'static, WorkspaceRuntime> {
    WORKSPACE_RUNTIME.read().await
}

pub async fn get_workspace_runtime_mut() -> RwLockWriteGuard<'static, WorkspaceRuntime> {
    WORKSPACE_RUNTIME.write().await
}

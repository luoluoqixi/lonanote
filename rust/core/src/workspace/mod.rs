pub mod config;
pub mod error;
pub mod file_tree;
pub mod storage;
pub mod storage_mount;
pub mod workspace_id;
pub mod workspace_instance;
pub mod workspace_locator;
pub mod workspace_manifest;
pub mod workspace_registry;
pub mod workspace_relative_path;
pub mod workspace_runtime;
pub mod workspace_savedata;
pub mod workspace_settings;

use std::sync::{Arc, LazyLock, OnceLock};
use thiserror::Error;
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use storage::{LocalPathStorageFactory, WorkspaceStorageFactory};
use workspace_registry::WorkspaceRegistry;
use workspace_runtime::WorkspaceRuntime;

static WORKSPACE_STORAGE_FACTORY: OnceLock<Arc<dyn WorkspaceStorageFactory>> = OnceLock::new();

static WORKSPACE_REGISTRY: OnceLock<Arc<RwLock<WorkspaceRegistry>>> = OnceLock::new();

pub static WORKSPACE_RUNTIME: LazyLock<Arc<RwLock<WorkspaceRuntime>>> =
    LazyLock::new(|| Arc::new(RwLock::new(WorkspaceRuntime::new())));

pub struct WorkspaceHostServices {
    pub storage_factory: Arc<dyn WorkspaceStorageFactory>,
}

impl WorkspaceHostServices {
    pub fn new(storage_factory: Arc<dyn WorkspaceStorageFactory>) -> Self {
        Self { storage_factory }
    }
}

impl std::fmt::Debug for WorkspaceHostServices {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("WorkspaceHostServices")
            .finish_non_exhaustive()
    }
}

pub fn install_workspace_host_services(
    services: WorkspaceHostServices,
) -> Result<(), WorkspaceStorageFactoryInstallError> {
    install_workspace_storage_factory(services.storage_factory)
}

pub fn install_workspace_storage_factory(
    factory: Arc<dyn WorkspaceStorageFactory>,
) -> Result<(), WorkspaceStorageFactoryInstallError> {
    if WORKSPACE_REGISTRY.get().is_some() {
        return Err(WorkspaceStorageFactoryInstallError::RegistryAlreadyInitialized);
    }
    WORKSPACE_STORAGE_FACTORY
        .set(factory)
        .map_err(|_| WorkspaceStorageFactoryInstallError::AlreadyInstalled)
}

pub async fn register_storage_mount(
    mount: storage_mount::StorageMountRecord,
) -> Result<(), error::WorkspaceError> {
    get_workspace_registry_mut()
        .await
        .register_mount(mount)
        .await
}

fn workspace_registry() -> &'static Arc<RwLock<WorkspaceRegistry>> {
    WORKSPACE_REGISTRY.get_or_init(|| {
        let factory = WORKSPACE_STORAGE_FACTORY
            .get()
            .cloned()
            .unwrap_or_else(|| Arc::new(LocalPathStorageFactory::new()));
        Arc::new(RwLock::new(WorkspaceRegistry::load_with_storage_factory(
            factory,
        )))
    })
}

pub async fn get_workspace_registry() -> RwLockReadGuard<'static, WorkspaceRegistry> {
    workspace_registry().read().await
}

pub async fn get_workspace_registry_mut() -> RwLockWriteGuard<'static, WorkspaceRegistry> {
    workspace_registry().write().await
}

pub async fn get_workspace_runtime() -> RwLockReadGuard<'static, WorkspaceRuntime> {
    WORKSPACE_RUNTIME.read().await
}

pub async fn get_workspace_runtime_mut() -> RwLockWriteGuard<'static, WorkspaceRuntime> {
    WORKSPACE_RUNTIME.write().await
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum WorkspaceStorageFactoryInstallError {
    #[error("Workspace storage factory 已安装")]
    AlreadyInstalled,
    #[error("Workspace registry 已初始化，不能再安装 storage factory")]
    RegistryAlreadyInitialized,
}

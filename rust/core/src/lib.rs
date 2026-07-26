pub mod api;
pub mod config;
pub(crate) mod settings;
pub mod utils;
pub(crate) mod workspace;

/// Workspace Storage v2 暴露给 Tauri、Swift/Kotlin bridge 和测试 host 的稳定 Rust 边界。
pub mod workspace_storage {
    pub use crate::workspace::{
        install_workspace_host_services, install_workspace_storage_factory, register_storage_mount,
        storage::{
            move_entry, LocalPathStorage, LocalPathStorageFactory, MemoryStorage,
            MemoryStorageFactory, MountedStorage, ScopedStorage, StorageAccessLease,
            StorageCapabilities, StorageEntry, StorageEntryKind, StorageEntryMetadata,
            StorageError, WorkspaceStorage, WorkspaceStorageFactory, WriteOptions,
        },
        storage_mount::{
            StorageAvailability, StorageMountId, StorageMountIdError, StorageMountKind,
            StorageMountRecord, StorageMountStatus, StorageMountValidationError,
        },
        workspace_id::{WorkspaceId, WorkspaceIdError},
        workspace_relative_path::{WorkspaceEntryName, WorkspacePathError, WorkspaceRelativePath},
        WorkspaceHostServices, WorkspaceStorageFactoryInstallError,
    };
}

use anyhow::Result;
pub use cmdreg::*;
use log::info;

pub fn init() -> Result<()> {
    info!("init...");
    cmdreg::reg_all_commands()?;
    info!("init finish!");
    Ok(())
}

pub fn init_log() -> Result<()> {
    utils::init_logger()?;
    Ok(())
}

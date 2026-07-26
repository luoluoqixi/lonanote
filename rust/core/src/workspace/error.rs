use thiserror::Error;

use super::{
    storage::StorageError,
    storage_mount::{StorageMountId, StorageMountIdError, StorageMountValidationError},
    workspace_id::{WorkspaceId, WorkspaceIdError},
    workspace_relative_path::WorkspacePathError,
};

#[derive(Debug, Error)]
pub enum WorkspaceError {
    #[error("Workspace 不存在: {0}")]
    NotFoundWorkspace(WorkspaceId),
    #[error("Storage mount 不存在: {0}")]
    NotFoundMount(StorageMountId),
    #[error("Storage mount 已存在: {0}")]
    AlreadyExistMount(StorageMountId),
    #[error("Workspace 已存在: {0}")]
    AlreadyExistWorkspace(WorkspaceId),
    #[error("Workspace locator 已被占用")]
    AlreadyExistLocator,
    #[error("Storage mount 仍被 Workspace 使用: {0}")]
    MountInUse(StorageMountId),
    #[error("Storage mount 配置无效: {0}")]
    InvalidMount(#[from] StorageMountValidationError),
    #[error("不能把 Storage mount 从 {from_kind} 改为 {to_kind}")]
    MountKindMismatch {
        from_kind: &'static str,
        to_kind: &'static str,
    },
    #[error("Workspace manifest 不存在")]
    ManifestNotFound,
    #[error("Workspace manifest ID 不匹配，期望 {expected}，实际 {actual}")]
    WorkspaceIdMismatch {
        expected: WorkspaceId,
        actual: WorkspaceId,
    },
    #[error("Workspace manifest schema 不受支持: {0}")]
    UnsupportedManifestSchema(u32),
    #[error("Workspace 名称不合法: {0}")]
    InvalidName(String),
    #[error("Workspace JSON 失败: {0}")]
    Json(String),
    #[error("Workspace registry IO 失败: {0}")]
    RegistryIo(String),
    #[error("Workspace 事务未完整收口（{stage}）: {message}")]
    MigrationIncomplete {
        stage: &'static str,
        message: String,
    },
    #[error(transparent)]
    Storage(#[from] StorageError),
    #[error(transparent)]
    InvalidWorkspaceId(#[from] WorkspaceIdError),
    #[error(transparent)]
    InvalidMountId(#[from] StorageMountIdError),
    #[error(transparent)]
    InvalidRelativePath(#[from] WorkspacePathError),
}

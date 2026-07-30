use thiserror::Error;

use super::domain::{StorageProviderId, WorkspaceId, WorkspaceRelativePath};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum WorkspaceIdError {
    #[error("Workspace ID 不能为空")]
    Empty,
    #[error("Workspace ID 不是合法 UUID")]
    InvalidFormat,
    #[error("Workspace ID 必须是小写、带连字符的 canonical UUID")]
    NotCanonical,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum StorageProviderIdError {
    #[error("Storage Provider ID 不能为空")]
    Empty,
    #[error("Storage Provider ID 不能包含首尾空白")]
    SurroundingWhitespace,
    #[error("Storage Provider ID 不能包含控制字符")]
    ControlCharacter,
    #[error("Storage Provider ID 必须使用小写")]
    NotLowercase,
    #[error("Storage Provider ID 只能包含小写 ASCII 字母、数字、-、_、.")]
    InvalidCharacter,
}

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum WorkspaceDirectoryNameError {
    #[error(transparent)]
    InvalidEntry(#[from] WorkspacePathError),
    #[error("Workspace 目录名不能以空格或点结尾")]
    TrailingDotOrSpace,
    #[error("Workspace 目录名不能使用平台保留名称")]
    ReservedName,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum WorkspacePathError {
    #[error("Workspace 相对路径不能是绝对路径")]
    Absolute,
    #[error("Workspace 相对路径不能以 / 结尾")]
    TrailingSlash,
    #[error("Workspace 相对路径不能包含空 component 或连续的 //")]
    EmptyComponent,
    #[error("Workspace 相对路径不能包含 . component")]
    CurrentDirectoryComponent,
    #[error("Workspace 相对路径不能包含 .. component")]
    ParentDirectoryComponent,
    #[error("Workspace 路径不能包含反斜杠")]
    Backslash,
    #[error("Workspace 路径不能包含控制字符")]
    ControlCharacter,
    #[error("Workspace entry name 不能为空")]
    EmptyEntryName,
    #[error("Workspace entry name 不能包含 /")]
    ForwardSlash,
    #[error("Workspace entry name 包含平台禁止字符")]
    PlatformForbiddenCharacter,
}

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum WorkspaceManifestError {
    #[error("不支持的 Workspace manifest schema: {0}")]
    UnsupportedSchema(u32),
    #[error("Workspace display name 不能为空或包含控制字符")]
    InvalidDisplayName,
    #[error("Workspace StorageBinding 无效")]
    InvalidStorageBinding,
}

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("存储路径不存在: {path}")]
    NotFound { path: WorkspaceRelativePath },
    #[error("存储路径已存在: {path}")]
    AlreadyExists { path: WorkspaceRelativePath },
    #[error("存储路径不是目录: {path}")]
    NotDirectory { path: WorkspaceRelativePath },
    #[error("存储路径是目录: {path}")]
    IsDirectory { path: WorkspaceRelativePath },
    #[error("目录非空: {path}")]
    DirectoryNotEmpty { path: WorkspaceRelativePath },
    #[error("不能通过 WorkspaceStorage 修改根目录")]
    CannotModifyRoot,
    #[error("存储路径越过 Workspace 根目录: {path}")]
    OutsideWorkspace { path: WorkspaceRelativePath },
    #[error("不支持的 Storage Provider: {provider_id}")]
    UnsupportedProvider { provider_id: StorageProviderId },
    #[error("存储不支持操作: {operation}")]
    UnsupportedOperation { operation: &'static str },
    #[error("存储授权尚未提供")]
    AuthorizationRequired,
    #[error("存储授权已经失效")]
    AuthorizationRevoked,
    #[error("Storage Provider 当前不可用")]
    ProviderUnavailable,
    #[error("Storage Provider 当前离线")]
    Offline,
    #[error("存储卷当前不可用")]
    VolumeUnavailable,
    #[error("文件尚未下载: {path}")]
    NotDownloaded { path: WorkspaceRelativePath },
    #[error("存储为只读，不能执行: {operation}")]
    ReadOnly { operation: &'static str },
    #[error("原生存储桥调用失败（{operation}）: {message}")]
    NativeBridge {
        operation: &'static str,
        message: String,
    },
    #[error("存储 IO 失败（{operation}）: {message}")]
    Io {
        operation: &'static str,
        message: String,
    },
}

impl StorageError {
    pub(crate) fn io(operation: &'static str, error: impl std::fmt::Display) -> Self {
        Self::Io {
            operation,
            message: error.to_string(),
        }
    }
}

#[derive(Debug, Error)]
pub enum WorkspaceError {
    #[error("Workspace 不存在: {0}")]
    NotFoundWorkspace(WorkspaceId),
    #[error("Workspace 已打开: {0}")]
    AlreadyOpen(WorkspaceId),
    #[error("Workspace 尚未打开: {0}")]
    NotOpen(WorkspaceId),
    #[error("Workspace 已注册: {0}")]
    AlreadyRegistered(WorkspaceId),
    #[error("存在相同 Workspace ID 的其他 StorageBinding: {0}")]
    DuplicateWorkspaceId(WorkspaceId),
    #[error("Workspace manifest 不存在")]
    ManifestNotFound,
    #[error("目标目录已经包含 Workspace manifest，请使用 attach")]
    ManifestAlreadyExists,
    #[error("Workspace ID 不匹配，期望 {expected}，实际 {actual}")]
    WorkspaceIdMismatch {
        expected: WorkspaceId,
        actual: WorkspaceId,
    },
    #[error("不支持的 Workspace manifest schema: {0}")]
    UnsupportedManifestSchema(u32),
    #[error("Workspace manifest 无效: {0}")]
    InvalidManifest(String),
    #[error("Workspace 已打开，不能执行该生命周期操作: {0}")]
    CannotModifyOpenWorkspace(WorkspaceId),
    #[error("Workspace Catalog 错误: {0}")]
    Catalog(String),
    #[error("Workspace 本机状态错误: {0}")]
    LocalState(String),
    #[error("Workspace display name 无效")]
    InvalidDisplayName,
    #[error("目标目录必须为空")]
    TargetNotEmpty,
    #[error("目标 StorageBinding 必须是 External")]
    ExpectedExternalBinding,
    #[error("目标 StorageBinding 已经是当前 StorageBinding")]
    SameStorageBinding,
    #[error("File Tree 在当前 Storage Provider 上不可用")]
    FileTreeUnavailable,
    #[error(transparent)]
    Storage(#[from] StorageError),
    #[error(transparent)]
    Path(#[from] WorkspacePathError),
    #[error(transparent)]
    Manifest(#[from] WorkspaceManifestError),
    #[error(transparent)]
    ProviderId(#[from] StorageProviderIdError),
    #[error(transparent)]
    DirectoryName(#[from] WorkspaceDirectoryNameError),
    #[error("UTF-8 解码失败: {0}")]
    Utf8(String),
}

impl From<serde_json::Error> for WorkspaceError {
    fn from(error: serde_json::Error) -> Self {
        Self::InvalidManifest(error.to_string())
    }
}

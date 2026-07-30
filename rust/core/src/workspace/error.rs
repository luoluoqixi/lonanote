use thiserror::Error;

#[derive(Error, Debug)]
pub enum WorkspaceError {
    #[error("[workspace] notfound path: {0}")]
    NotFoundPath(String),
    #[error("[workspace] io error: {0}")]
    IOError(String),
    #[error("[workspace] parse config error: {0}")]
    ParseConfigError(String),
    #[error("[workspace] json error: {0}")]
    JsonError(String),
    #[error("[workspace] notfound workspace: {0}")]
    NotFoundWorkspace(String),
    #[error("[workspace] already existed workspace: {0}")]
    AlreadyExistWorkspace(String),
    #[error("[workspace] already existed open workspace: {0}")]
    AlreadyExistOpenWorkspace(String),
    #[error("[workspace] cannot remove an already open workspace: {0}")]
    RemoveAlreadyOpenWorkspace(String),
    #[error("[workspace] workspace init error: {0}")]
    InitError(String),

    #[error("[workspace] unknow error: {0}")]
    UnknowError(String),
}

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

    #[error("[workspace] unknow error: {0}")]
    UnknowError(String),
}

use thiserror::Error;

#[derive(Error, Debug)]
pub enum WorkspaceError {
    #[error("[workspace] load workspace error: {0}")]
    LoadError(String),
}

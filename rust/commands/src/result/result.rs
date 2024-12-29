use anyhow::Result;

use serde::Serialize;

pub type CommandResult = Result<CommandResponse>;

pub enum CommandResponse {
    Json(String),
    None,
}

impl CommandResponse {
    pub fn json<T>(data: T) -> Result<Self>
    where
        T: Serialize,
    {
        match serde_json::to_string(&data) {
            Ok(r) => Ok(Self::Json(r)),
            Err(err) => Err(err.into()),
        }
    }
    pub fn from_option(option: Option<String>) -> CommandResponse {
        match option {
            Some(s) => CommandResponse::Json(s),
            None => CommandResponse::None,
        }
    }
    pub fn into_option(self) -> Option<String> {
        match self {
            CommandResponse::Json(s) => Some(s),
            CommandResponse::None => None,
        }
    }
    pub fn is_none(&self) -> bool {
        !self.is_some()
    }
    pub const fn is_some(&self) -> bool {
        matches!(*self, CommandResponse::Json(_))
    }
}

use serde_json::Value;

#[derive(Clone, Debug)]
pub enum CommandContext<'a> {
    String(&'a String),
    Value(&'a Value),
    None,
}

unsafe impl Send for CommandContext<'_> {}

impl<'a> CommandContext<'a> {
    pub fn from_string(args: Option<&'a String>) -> Self {
        match args {
            Some(s) => CommandContext::String(s),
            None => CommandContext::None,
        }
    }
    pub fn from_value(args: Option<&'a Value>) -> Self {
        match args {
            Some(v) => CommandContext::Value(v),
            None => CommandContext::None,
        }
    }
    pub fn is_some(&self) -> bool {
        match self {
            CommandContext::String(_) => true,
            CommandContext::Value(_) => true,
            CommandContext::None => false,
        }
    }
    pub fn is_none(&self) -> bool {
        !self.is_some()
    }
}

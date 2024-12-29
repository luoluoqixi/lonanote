use anyhow::{anyhow, Result};

use super::super::{body::Json, context::CommandContext};

pub trait FromCommandArgs: Sized {
    fn from_args(key: &str, ctx: &CommandContext) -> Result<Self>;
}

impl<T> FromCommandArgs for Json<T>
where
    T: for<'de> serde::Deserialize<'de>,
{
    fn from_args(key: &str, ctx: &CommandContext) -> Result<Self> {
        match ctx {
            CommandContext::String(args) => {
                let input_t = serde_json::from_str::<T>(args)?;
                Ok(Json(input_t))
            }
            CommandContext::Value(args) => {
                let input_t = T::deserialize(*args)?;
                Ok(Json(input_t))
            }
            CommandContext::None => Err(anyhow!(
                "expected [JSON] body but no body provided: {}",
                key
            )),
        }
    }
}

impl FromCommandArgs for () {
    fn from_args(_: &str, _: &CommandContext) -> Result<Self> {
        Ok(())
    }
}

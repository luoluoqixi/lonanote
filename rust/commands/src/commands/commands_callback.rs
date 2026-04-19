use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::{
    future::Future,
    pin::Pin,
    sync::{Arc, LazyLock},
};
use tokio::sync::RwLock;

use super::super::Commands;

pub type CommandHandlerValueCallbackResult =
    Pin<Box<dyn Future<Output = Result<Option<String>>> + Send>>;

pub type CommandHandlerValueCallback =
    Box<dyn Fn(Option<String>) -> CommandHandlerValueCallbackResult + Send + Sync>;

pub type CommandsCallbackSync = Commands<String, CommandHandlerValueCallback>;

static COMMANDS_CALLBACK: LazyLock<Arc<RwLock<CommandsCallbackSync>>> =
    LazyLock::new(|| Arc::new(RwLock::new(CommandsCallbackSync::new())));

pub fn reg_command_callback(command: String, handler: CommandHandlerValueCallback) -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let mut commands = COMMANDS_CALLBACK.write().await;
        commands.reg(command, handler);
    });

    Ok(())
}
pub fn unreg_command_callback(command: &String) -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let mut commands = COMMANDS_CALLBACK.write().await;
        commands.unreg(command);
    });
    Ok(())
}
pub fn clear_command_callback() -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let mut commands = COMMANDS_CALLBACK.write().await;
        commands.clear();
    });
    Ok(())
}
pub fn get_command_callback_keys() -> Result<Vec<String>> {
    let rt = tokio::runtime::Runtime::new()?;
    let keys = rt.block_on(async {
        let commands = COMMANDS_CALLBACK.read().await;
        commands.get_keys()
    });
    Ok(keys)
}
pub fn get_command_callback_len() -> Result<usize> {
    let rt = tokio::runtime::Runtime::new()?;
    let len = rt.block_on(async {
        let commands = COMMANDS_CALLBACK.read().await;
        commands.len()
    });
    Ok(len)
}
pub async fn invoke_command_callback(
    key: impl AsRef<str>,
    args: Option<String>,
) -> Result<Option<String>> {
    let commands = COMMANDS_CALLBACK.read().await;
    let k = key.as_ref().to_string();
    if let Some(cmd) = commands.get(&k) {
        cmd(args).await
    } else {
        Err(anyhow!("async command not found: {}", k,))
    }
}

pub async fn invoke_command_callback_lazy<T, TRet>(
    key: impl AsRef<str>,
    args: Option<T>,
) -> Result<Option<TRet>>
where
    T: Serialize,
    TRet: for<'de> Deserialize<'de>,
{
    let args = match args {
        Some(args) => Some(serde_json::to_string(&args)?),
        None => None,
    };
    let res = invoke_command_callback(key, args).await?;
    match res {
        Some(res) => Ok(Some(serde_json::from_str::<TRet>(res.as_str())?)),
        None => Ok(None),
    }
}

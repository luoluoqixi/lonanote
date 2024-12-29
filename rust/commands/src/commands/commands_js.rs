use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::{
    future::Future,
    pin::Pin,
    sync::{Arc, LazyLock},
};
use tokio::sync::RwLock;

use super::super::Commands;

pub type CommandHandlerValueJsResult = Pin<Box<dyn Future<Output = Result<Option<String>>> + Send>>;

pub type CommandHandlerValueJs =
    Box<dyn Fn(Option<String>) -> CommandHandlerValueJsResult + Send + Sync>;

pub type CommandsJsSync = Commands<String, CommandHandlerValueJs>;

static COMMANDS_JS: LazyLock<Arc<RwLock<CommandsJsSync>>> =
    LazyLock::new(|| Arc::new(RwLock::new(CommandsJsSync::new())));

pub fn reg_command_js(command: String, handler: CommandHandlerValueJs) -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let mut commands = COMMANDS_JS.write().await;
        commands.reg(command, handler);
    });

    Ok(())
}
pub fn unreg_command_js(command: &String) -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let mut commands = COMMANDS_JS.write().await;
        commands.unreg(&command);
    });
    Ok(())
}
pub fn clear_command_js() -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let mut commands = COMMANDS_JS.write().await;
        commands.clear();
    });
    Ok(())
}
pub fn get_command_js_keys() -> Result<Vec<String>> {
    let rt = tokio::runtime::Runtime::new()?;
    let keys = rt.block_on(async {
        let commands = COMMANDS_JS.read().await;
        commands.get_keys()
    });
    Ok(keys)
}
pub fn get_command_js_len() -> Result<usize> {
    let rt = tokio::runtime::Runtime::new()?;
    let len = rt.block_on(async {
        let commands = COMMANDS_JS.read().await;
        commands.len()
    });
    Ok(len)
}
pub async fn invoke_command_js(
    key: impl AsRef<str>,
    args: Option<String>,
) -> Result<Option<String>> {
    let commands = COMMANDS_JS.read().await;
    let k = key.as_ref().to_string();
    if let Some(cmd) = commands.get(&k) {
        cmd(args).await
    } else {
        Err(anyhow!("async command not found: {}", k,))
    }
}

pub async fn invoke_command_js_lazy<T, TRet>(
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
    let res = invoke_command_js(key, args).await?;
    match res {
        Some(res) => Ok(Some(serde_json::from_str::<TRet>(res.as_str())?)),
        None => Ok(None),
    }
}

use anyhow::{anyhow, Result};
use std::{
    future::Future,
    pin::Pin,
    sync::{Arc, LazyLock},
};

use super::{
    super::{context::CommandContext, handler::CommandHandlerAsync, result::CommandResult},
    Commands,
};

use tokio::sync::RwLock;

type CommandHandlerResultAsync<'a> = Pin<Box<dyn Future<Output = CommandResult> + Send + 'a>>;

type CommandHandlerValueAsync =
    Box<dyn for<'b> Fn(&'b str, CommandContext<'b>) -> CommandHandlerResultAsync<'b> + Send + Sync>;

pub type CommandsAsync = Commands<&'static str, CommandHandlerValueAsync>;

static COMMANDS_ASYNC: LazyLock<Arc<RwLock<CommandsAsync>>> =
    LazyLock::new(|| Arc::new(RwLock::new(CommandsAsync::new())));

pub fn reg_command_async<T, H>(command: &'static str, handler: H) -> Result<()>
where
    H: CommandHandlerAsync<T> + Send + Sync + 'static,
{
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let mut commands = COMMANDS_ASYNC.write().await;
        let f = std::sync::Arc::new(handler);
        let wrapped_fn =
            for<'b> move |key: &'b str, ctx: CommandContext<'b>| -> CommandHandlerResultAsync<'b> {
                let f = std::sync::Arc::clone(&f);
                Box::pin(async move {
                    let f = f.call(key, ctx);
                    f.await
                })
            };
        commands.reg(command, Box::new(wrapped_fn));
    });
    // COMMANDS_ASYNC
    //     .write()
    //     .unwrap()
    //     .reg(command, handler);

    Ok(())
}
pub fn unreg_command_async(command: &'static str) -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let mut commands = COMMANDS_ASYNC.write().await;
        commands.unreg(&command);
    });
    Ok(())
}
pub fn clear_command_async() -> Result<()> {
    let rt = tokio::runtime::Runtime::new()?;
    rt.block_on(async {
        let mut commands = COMMANDS_ASYNC.write().await;
        commands.clear();
    });
    Ok(())
}
pub fn get_command_async_keys() -> Result<Vec<String>> {
    let rt = tokio::runtime::Runtime::new()?;
    let keys = rt.block_on(async {
        let commands = COMMANDS_ASYNC.read().await;
        commands.get_keys()
    });
    Ok(keys)
}
pub fn get_command_async_len() -> Result<usize> {
    let rt = tokio::runtime::Runtime::new()?;
    let len = rt.block_on(async {
        let commands = COMMANDS_ASYNC.read().await;
        commands.len()
    });
    Ok(len)
}
pub async fn invoke_command_async<'a>(key: &'a str, ctx: CommandContext<'a>) -> CommandResult {
    let commands = COMMANDS_ASYNC.read().await;
    // let commands = COMMANDS_ASYNC.read().unwrap();
    if let Some(cmd) = commands.get(&key) {
        cmd(key, ctx).await
    } else {
        Err(anyhow!("async command not found: {}", key))
    }
}

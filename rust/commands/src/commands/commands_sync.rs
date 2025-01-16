use anyhow::{anyhow, Result};
use std::sync::{Arc, LazyLock, RwLock};

use super::{
    super::{context::CommandContext, handler::CommandHandler, result::CommandResult},
    Commands,
};

type CommandHandlerValue = Box<dyn Fn(&str, CommandContext) -> CommandResult + Send + Sync>;

pub type CommandsSync = Commands<&'static str, CommandHandlerValue>;

static COMMANDS: LazyLock<Arc<RwLock<CommandsSync>>> =
    LazyLock::new(|| Arc::new(RwLock::new(Commands::new())));

pub fn reg_command<T, H>(command: &'static str, handler: H) -> Result<()>
where
    H: CommandHandler<T>,
{
    match COMMANDS.write() {
        Ok(mut commands) => {
            let wrapped_fn =
                move |key: &str, ctx: CommandContext| -> CommandResult { handler.call(key, ctx) };
            commands.reg(command, Box::new(wrapped_fn));
            Ok(())
        }
        Err(err) => Err(anyhow!(err.to_string())),
    }
}
pub fn unreg_command(command: &'static str) -> Result<()> {
    match COMMANDS.write() {
        Ok(mut commands) => {
            commands.unreg(&command);
            Ok(())
        }
        Err(err) => Err(anyhow!(err.to_string())),
    }
}
pub fn clear_command() -> Result<()> {
    match COMMANDS.write() {
        Ok(mut commands) => {
            commands.clear();
            Ok(())
        }
        Err(err) => Err(anyhow!(err.to_string())),
    }
}
pub fn get_command_keys() -> Result<Vec<String>> {
    match COMMANDS.read() {
        Ok(commands) => Ok(commands.get_keys()),
        Err(err) => Err(anyhow!(err.to_string())),
    }
}
pub fn get_command_len() -> Result<usize> {
    match COMMANDS.read() {
        Ok(commands) => Ok(commands.len()),
        Err(err) => Err(anyhow!(err.to_string())),
    }
}
pub fn invoke_command(key: &str, ctx: CommandContext) -> CommandResult {
    match COMMANDS.read() {
        Ok(commands) => {
            if let Some(cmd) = commands.get(&key) {
                cmd(key, ctx)
            } else {
                Err(anyhow!("async command not found: {}", key))
            }
        }
        Err(err) => Err(anyhow!(err.to_string())),
    }
}

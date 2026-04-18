use log::info;
use tauri::{Builder, Runtime};

pub mod hello_command;

pub fn reg_commands<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    info!("register commands...");
    let builder = hello_command::reg_commands(builder);
    info!("register commands finish!");
    builder
}

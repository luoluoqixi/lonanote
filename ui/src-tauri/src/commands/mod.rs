mod invoke;

use anyhow::Result;
use invoke::*;
use tauri::{Builder, Runtime};

pub fn reg_commands<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder.invoke_handler(tauri::generate_handler![
        invoke,
        invoke_async,
        get_command_len,
        get_command_keys,
        get_command_async_len,
        get_command_async_keys,
        reg_callback_function,
        unreg_callback_function,
        clear_callback_function,
        get_callback_keys,
        get_callback_len,
        invoke_callback,
    ])
}

pub fn init_commands() -> Result<()> {
    lonanote_core::init()?;
    Ok(())
}

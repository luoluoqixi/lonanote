mod commands;

use anyhow::Result;
use commands::*;
use tauri::{Builder, Runtime};

pub fn reg_commands<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder.invoke_handler(tauri::generate_handler![
        invoke,
        invoke_async,
        get_command_len,
        get_command_keys,
        get_command_async_len,
        get_command_async_keys,
        reg_js_function,
        unreg_js_function,
        clear_js_function,
        get_command_js_keys,
        get_command_js_len,
    ])
}

pub fn init_commands() -> Result<()> {
    lonanote_core::init()?;
    Ok(())
}

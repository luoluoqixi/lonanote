use std::sync::Arc;

use anyhow::Result;
use flutter_rust_bridge::DartFnFuture;
use lonanote_core::{
    context::CommandContext, invoke_command, invoke_command_async, result::CommandResult,
};

fn parse_invoke_result(res: CommandResult) -> Result<Option<String>> {
    let res = res?;
    Ok(res.into_option())
}

#[flutter_rust_bridge::frb(sync)]
pub fn init() -> Option<String> {
    match lonanote_core::init() {
        Ok(_) => None,
        Err(err) => Some(format!("init rust error: {err}")),
    }
}

#[flutter_rust_bridge::frb(sync)]
pub fn invoke(key: String, args: Option<String>) -> Result<Option<String>> {
    let res = invoke_command(&key.to_string(), CommandContext::from_string(args.as_ref()));
    parse_invoke_result(res)
}

#[flutter_rust_bridge::frb(sync)]
pub fn get_command_keys() -> Result<Vec<String>> {
    lonanote_core::get_command_keys()
}

#[flutter_rust_bridge::frb(sync)]
pub fn get_command_len() -> Result<usize> {
    lonanote_core::get_command_len()
}

#[flutter_rust_bridge::frb]
pub async fn invoke_async(key: String, args: Option<String>) -> Result<Option<String>> {
    let res =
        invoke_command_async(&key.to_string(), CommandContext::from_string(args.as_ref())).await;
    parse_invoke_result(res)
}

#[flutter_rust_bridge::frb(sync)]
pub fn get_command_async_keys() -> Result<Vec<String>> {
    lonanote_core::get_command_async_keys()
}

#[flutter_rust_bridge::frb(sync)]
pub fn get_command_async_len() -> Result<usize> {
    lonanote_core::get_command_async_len()
}

#[flutter_rust_bridge::frb(sync)]
pub fn reg_dart_function(
    key: String,
    callback: impl Fn(Option<String>) -> DartFnFuture<Option<String>> + Send + Sync + 'static,
) -> Result<()> {
    let callback = Arc::new(callback);
    let wrapped_fn = move |args: Option<String>| -> lonanote_core::CommandHandlerValueJsResult {
        let callback = Arc::clone(&callback);
        Box::pin(async move {
            let r = callback(args).await;
            Ok(r)
        })
    };
    lonanote_core::reg_command_js(key, Box::new(wrapped_fn))?;

    Ok(())
}

#[flutter_rust_bridge::frb(sync)]
pub fn unreg_dart_function(key: String) -> Result<()> {
    lonanote_core::unreg_command_js(&key)?;
    Ok(())
}

#[flutter_rust_bridge::frb(sync)]
pub fn clear_dart_function() -> Result<()> {
    lonanote_core::clear_command_js()?;
    Ok(())
}

#[flutter_rust_bridge::frb(sync)]
pub fn get_command_dart_keys() -> Result<Vec<String>> {
    lonanote_core::get_command_js_keys()
}

#[flutter_rust_bridge::frb(sync)]
pub fn get_command_dart_len() -> Result<usize> {
    lonanote_core::get_command_js_len()
}

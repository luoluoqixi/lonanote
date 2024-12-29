use anyhow::{anyhow, Result};
use lonanote_core::{
    context::CommandContext,
    invoke_command, invoke_command_async,
    result::{CommandResponse, CommandResult},
};
use serde_json::Value;
use tauri::{
    command,
    ipc::{InvokeBody, Request, Response},
    Emitter, Listener,
};

use crate::{APP_HANDLE, MAIN_WINDOW_NAME};

pub fn parse_invoke_result(res: CommandResult) -> Result<Response, String> {
    match res {
        Ok(r) => match r {
            CommandResponse::Json(json) => Ok(Response::new(InvokeBody::Json(Value::String(json)))),
            CommandResponse::None => Ok(Response::new(InvokeBody::Json(Value::Null))),
        },
        Err(err) => Err(err.to_string()),
    }
}

fn parse_invoke_args<'a>(request: &'a Request<'a>) -> Result<(String, CommandContext<'a>)> {
    let key = request.headers().get("key");
    match key {
        Some(k) => {
            let k = k.to_str()?;
            let data = if let InvokeBody::Json(data) = request.body() {
                match data {
                    Value::Object(map) => match map.get("args") {
                        Some(args) => match args {
                            Value::String(s) => Some(s),
                            _ => None,
                        },
                        None => None,
                    },
                    _ => None,
                }
            } else {
                None
            };
            Ok((k.to_string(), CommandContext::from_str(data)))
        }
        None => Err(anyhow!("error invoke, notfound key")),
    }
}

#[command]
pub fn invoke(request: Request<'_>) -> Result<Response, String> {
    match parse_invoke_args(&request) {
        Ok((key, args)) => {
            let res = invoke_command(key.as_str(), args);
            parse_invoke_result(res)
        }
        Err(err) => Err(err.to_string()),
    }
}

#[command]
pub fn get_command_keys() -> Result<Vec<String>, String> {
    let res = lonanote_core::get_command_keys();
    res.map_err(|e| e.to_string())
}

#[command]
pub fn get_command_len() -> Result<usize, String> {
    let res = lonanote_core::get_command_len();
    res.map_err(|e| e.to_string())
}

#[command]
pub async fn invoke_async(request: Request<'_>) -> Result<Response, String> {
    match parse_invoke_args(&request) {
        Ok((key, args)) => {
            let res = invoke_command_async(key.as_str(), args).await;
            parse_invoke_result(res)
        }
        Err(err) => Err(err.to_string()),
    }
}

#[command]
pub fn get_command_async_keys() -> Result<Vec<String>, String> {
    let res = lonanote_core::get_command_async_keys();
    res.map_err(|e| e.to_string())
}

#[command]
pub fn get_command_async_len() -> Result<usize, String> {
    let res = lonanote_core::get_command_async_len();
    res.map_err(|e| e.to_string())
}

#[command]
pub fn reg_js_function(key: String) -> Result<(), String> {
    let handle = APP_HANDLE.get().ok_or("app handle is None".to_string())?;
    let k = key.clone();
    let wrapped_fn = move |args: Option<String>| -> lonanote_core::CommandHandlerValueJsResult {
        let js_result_event = format!("js_result:{}:return", key.as_str());
        let res = handle.emit_to(MAIN_WINDOW_NAME, key.as_str(), args);
        Box::pin(async move {
            res?;
            let (tx, rx) = tokio::sync::oneshot::channel();
            handle.once(js_result_event, move |e| {
                let _ = tx.send(e.payload().to_string());
            });
            let payload = rx.await?;
            let res = serde_json::from_str::<Option<String>>(&payload)?;
            Ok(res)
        })
    };
    lonanote_core::reg_command_js(k, Box::new(wrapped_fn)).map_err(|err| err.to_string())?;

    Ok(())
}

#[command]
pub fn unreg_js_function(key: String) -> Result<(), String> {
    lonanote_core::unreg_command_js(&key).map_err(|err| err.to_string())?;
    Ok(())
}

#[command]
pub fn clear_js_function() -> Result<(), String> {
    lonanote_core::clear_command_js().map_err(|err| err.to_string())?;
    Ok(())
}

#[command]
pub fn get_command_js_keys() -> Result<Vec<String>, String> {
    let res = lonanote_core::get_command_js_keys();
    res.map_err(|e| e.to_string())
}

#[command]
pub fn get_command_js_len() -> Result<usize, String> {
    let res = lonanote_core::get_command_js_len();
    res.map_err(|e| e.to_string())
}

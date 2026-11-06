use anyhow::{anyhow, Result};
use lonanote_core::{
    invoke_command, invoke_command_async, CommandContext, CommandResponse, CommandResult,
};
use serde_json::Value;
use tauri::{
    command,
    ipc::{InvokeBody, Request, Response},
};

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
                        Some(Value::String(s)) => Some(s),
                        _ => None,
                    },
                    _ => None,
                }
            } else {
                None
            };
            Ok((k.to_string(), CommandContext::from_string(data)))
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
pub async fn invoke_async(
    window: tauri::WebviewWindow,
    request: Request<'_>,
) -> Result<Response, String> {
    match parse_invoke_args(&request) {
        Ok((key, args)) => {
            if key.starts_with("workspace.") {
                let data = match request.body() {
                    InvokeBody::Json(body) => body
                        .get("args")
                        .and_then(Value::as_str)
                        .and_then(|args| serde_json::from_str::<Value>(args).ok())
                        .unwrap_or(Value::Null),
                    _ => Value::Null,
                };
                let res = super::window_callbacks::CALLING_WINDOW
                    .scope(
                        window.label().to_string(),
                        super::window_workspace_api::invoke_workspace(&window, &key, args, &data),
                    )
                    .await?;
                parse_invoke_result(Ok(res))
            } else {
                let res = super::window_callbacks::CALLING_WINDOW
                    .scope(
                        window.label().to_string(),
                        invoke_command_async(key.as_str(), args),
                    )
                    .await;
                parse_invoke_result(res)
            }
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

use std::{
    collections::{HashMap, HashSet},
    sync::{LazyLock, Mutex},
};
use tauri::{Emitter, Manager, WebviewWindow};

tokio::task_local! { pub static CALLING_WINDOW: String; }
static REGISTRATIONS: LazyLock<Mutex<HashMap<String, HashSet<String>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
type Reply = Result<Option<String>, String>;
type PendingKey = (String, String, String);
static PENDING: LazyLock<Mutex<HashMap<PendingKey, tokio::sync::oneshot::Sender<Reply>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CallbackRequest {
    request_id: String,
    key: String,
    args: Option<String>,
}

#[tauri::command]
pub fn reg_callback_function(window: WebviewWindow, key: String) -> Result<(), String> {
    let mut registrations = REGISTRATIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    if !registrations.contains_key(&key) {
        let app = window.app_handle().clone();
        let callback_key = key.clone();
        lonanote_core::reg_command_callback(
            key.clone(),
            Box::new(move |args| {
                let caller = CALLING_WINDOW
                    .try_with(Clone::clone)
                    .map_err(|_| anyhow::anyhow!("回调缺少调用窗口上下文"));
                let app = app.clone();
                let key = callback_key.clone();
                Box::pin(async move {
                    let label = caller?;
                    let registered = REGISTRATIONS
                        .lock()
                        .unwrap_or_else(|error| error.into_inner())
                        .get(&key)
                        .is_some_and(|labels| labels.contains(&label));
                    anyhow::ensure!(registered, "当前窗口未注册回调：{key}");
                    let request_id = uuid::Uuid::new_v4().to_string();
                    let pending_key = (label.clone(), request_id.clone(), key.clone());
                    let (sender, receiver) = tokio::sync::oneshot::channel();
                    PENDING
                        .lock()
                        .unwrap_or_else(|error| error.into_inner())
                        .insert(pending_key.clone(), sender);
                    let result = match app.emit_to(
                        label,
                        "lonanote://callback-request",
                        CallbackRequest {
                            request_id,
                            key,
                            args,
                        },
                    ) {
                        Ok(()) => {
                            match tokio::time::timeout(std::time::Duration::from_secs(60), receiver)
                                .await
                            {
                                Ok(Ok(result)) => result,
                                _ => Err("窗口回调已取消或超时".to_string()),
                            }
                        }
                        Err(error) => Err(error.to_string()),
                    };
                    PENDING
                        .lock()
                        .unwrap_or_else(|error| error.into_inner())
                        .remove(&pending_key);
                    result.map_err(anyhow::Error::msg)
                })
            }),
        )
        .map_err(|error| error.to_string())?;
        registrations.insert(key.clone(), HashSet::new());
    }
    registrations
        .get_mut(&key)
        .unwrap()
        .insert(window.label().to_string());
    Ok(())
}

#[tauri::command]
pub fn resolve_callback(
    window: WebviewWindow,
    request_id: String,
    key: String,
    result: Option<String>,
    error: Option<String>,
) {
    let pending_key = (window.label().to_string(), request_id, key);
    if let Some(sender) = PENDING
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .remove(&pending_key)
    {
        let _ = sender.send(match error {
            Some(error) => Err(error),
            None => Ok(result),
        });
    }
}

#[tauri::command]
pub fn unreg_callback_function(window: WebviewWindow, key: String) {
    if let Some(labels) = REGISTRATIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .get_mut(&key)
    {
        labels.remove(window.label());
    }
    PENDING
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .retain(|(label, _, pending_key), _| label != window.label() || pending_key != &key);
}

pub fn cleanup_callbacks(label: &str) {
    for labels in REGISTRATIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .values_mut()
    {
        labels.remove(label);
    }
    PENDING
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .retain(|(owner, _, _), _| owner != label);
}

#[tauri::command]
pub fn clear_callback_function(window: WebviewWindow) {
    cleanup_callbacks(window.label());
}

#[tauri::command]
pub fn get_callback_keys(window: WebviewWindow) -> Vec<String> {
    let mut keys: Vec<_> = REGISTRATIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .iter()
        .filter(|(_, labels)| labels.contains(window.label()))
        .map(|(key, _)| key.clone())
        .collect();
    keys.sort();
    keys
}

#[tauri::command]
pub fn get_callback_len(window: WebviewWindow) -> usize {
    get_callback_keys(window).len()
}

#[tauri::command]
pub async fn invoke_callback(
    window: WebviewWindow,
    key: String,
    args: Option<String>,
) -> Result<Option<String>, String> {
    CALLING_WINDOW
        .scope(
            window.label().to_string(),
            lonanote_core::invoke_command_callback(key, args),
        )
        .await
        .map_err(|error| error.to_string())
}

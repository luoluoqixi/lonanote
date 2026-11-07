use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, Ordering},
        LazyLock, Mutex,
    },
};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tokio::sync::oneshot;

pub static ALLOW_EXIT: AtomicBool = AtomicBool::new(false);
pub static CLOSE_ACTIVE: AtomicBool = AtomicBool::new(false);
pub static WINDOW_LIFECYCLE_GATE: Mutex<()> = Mutex::new(());
static CLOSE_ROUND: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());
type ResponseKey = (String, String, String);
static RESPONSES: LazyLock<Mutex<HashMap<ResponseKey, oneshot::Sender<bool>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CloseMessage {
    window_label: String,
    request_id: String,
    stage: String,
    closing_owner: bool,
}

#[tauri::command]
pub fn respond_window_close(
    window: WebviewWindow,
    request_id: String,
    stage: String,
    accepted: bool,
) {
    let key = (window.label().to_string(), request_id, stage);
    if let Some(sender) = RESPONSES
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .remove(&key)
    {
        let _ = sender.send(accepted);
    }
}

pub fn cleanup_window(label: &str) {
    RESPONSES
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .retain(|(owner, _, _), _| owner != label);
}

#[tauri::command]
pub async fn request_window_close(window: WebviewWindow) -> Result<bool, String> {
    request_close(
        window.app_handle().clone(),
        Some(window.label().to_string()),
    )
    .await
}

async fn exchange(
    window: &WebviewWindow,
    request_id: &str,
    stage: &str,
    closing_owner: bool,
) -> Result<bool, String> {
    log::info!(
        "window-close exchange: window={}, request={request_id}, stage={stage}",
        window.label()
    );
    let key = (
        window.label().to_string(),
        request_id.to_string(),
        stage.to_string(),
    );
    let (sender, receiver) = oneshot::channel();
    RESPONSES
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .insert(key.clone(), sender);
    // Emitter::emit 即使由 window 调用也会全局广播，关闭协议必须显式指定目标。
    let emitted = window.emit_to(
        tauri::EventTarget::webview_window(window.label()),
        "lonanote://window-close",
        CloseMessage {
            window_label: window.label().to_string(),
            request_id: request_id.to_string(),
            stage: stage.to_string(),
            closing_owner,
        },
    );
    let result = match emitted {
        // 用户确认可能持续任意时长；窗口销毁会撤销 sender，不能把迟到确认当成新一轮。
        Ok(()) if stage == "prepare" => receiver
            .await
            .map_err(|_| "窗口关闭确认通道已中断".to_string()),
        Ok(()) => match tokio::time::timeout(
            std::time::Duration::from_secs(if stage == "abort" { 10 } else { 120 }),
            receiver,
        )
        .await
        {
            Ok(result) => result.map_err(|_| "窗口关闭确认通道已中断".to_string()),
            Err(_) => Err("等待窗口关闭确认超时".to_string()),
        },
        Err(error) => Err(error.to_string()),
    };
    RESPONSES
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .remove(&key);
    result
}

async fn abort(windows: &[WebviewWindow], request_id: &str, closing_owner: bool) {
    for window in windows {
        let result = exchange(window, request_id, "abort", closing_owner).await;
        if !matches!(result, Ok(true)) {
            log::warn!("撤销窗口关闭失败：{result:?}");
            let message = super::window_runtime::EDITOR_WINDOW_SESSIONS
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .member_lifecycle(window.label(), Some(request_id));
            if let Some(message) = message {
                let _ = window.emit_to(
                    tauri::EventTarget::webview_window(&message.owner_window_label),
                    "lonanote://editor-window-close-aborted",
                    message,
                );
            }
        }
    }
}

pub async fn request_close(app: AppHandle, only_window: Option<String>) -> Result<bool, String> {
    let Ok(_round) = CLOSE_ROUND.try_lock() else {
        return Ok(false);
    };
    struct Reset;
    impl Drop for Reset {
        fn drop(&mut self) {
            CLOSE_ACTIVE.store(false, Ordering::SeqCst);
        }
    }
    let _reset = Reset;
    let closing_owner = only_window.as_ref().is_none_or(|label| {
        !super::window_runtime::EDITOR_WINDOW_SESSIONS
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .is_editor(label)
    });
    let request_id = uuid::Uuid::new_v4().to_string();
    log::info!("window-close requested: target={only_window:?}, request={request_id}");
    let mut windows: Vec<_> = {
        // 与窗口工厂原子交接，不能漏掉已通过创建检查、尚未 build 完成的窗口。
        let _gate = WINDOW_LIFECYCLE_GATE
            .lock()
            .unwrap_or_else(|error| error.into_inner());
        CLOSE_ACTIVE.store(true, Ordering::SeqCst);
        let close_labels = only_window.as_ref().map(|label| {
            super::window_runtime::EDITOR_WINDOW_SESSIONS
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .close_members(label)
        });
        app.webview_windows()
            .into_values()
            .filter(|window| {
                close_labels
                    .as_ref()
                    .is_none_or(|labels| labels.iter().any(|label| label == window.label()))
            })
            .collect()
    };
    windows.sort_by_key(|window| {
        let editor = super::window_runtime::EDITOR_WINDOW_SESSIONS
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .is_editor(window.label());
        (!editor, window.label().to_string())
    });
    let preparing = async {
        // 先对所有窗口建立禁止新开文档的屏障，再逐窗确认，避免多个对话框抢焦点。
        for window in &windows {
            if !exchange(window, &request_id, "barrier", closing_owner).await? {
                return Ok(false);
            }
        }
        for window in &windows {
            let _ = window.unminimize();
            let _ = window.set_focus();
            if !exchange(window, &request_id, "prepare", closing_owner).await? {
                return Ok(false);
            }
        }
        Ok::<bool, String>(true)
    }
    .await;
    if !matches!(preparing, Ok(true)) {
        abort(&windows, &request_id, closing_owner).await;
        return preparing;
    }
    // 工作区写盘已在 prepare 完成。单窗口还需在销毁前关闭自身 Core 实例。
    if let Some(label) = &only_window {
        let _guard = crate::commands::window_workspace_api::WORKSPACE_GATE
            .write()
            .await;
        if let Some(id) = super::window_runtime::WINDOW_SESSIONS.current_workspace(label) {
            if let Err(error) = lonanote_core::workspace::workspace_manager()
                .close_workspace(&id)
                .await
            {
                abort(&windows, &request_id, closing_owner).await;
                return Err(error.to_string());
            }
            super::window_runtime::WINDOW_SESSIONS
                .release_workspace(label, id)
                .map_err(|error| error.to_string())?;
        }
    }
    for window in &windows {
        // 提交决定之后不再执行可能失败的持久化或弹窗。
        // commit 是不可撤销决定。某个 WebView 没有回复时仍必须完成全部窗口收尾，
        // 不能留下已经放弃草稿、却继续运行的半提交窗口。
        if !matches!(
            exchange(window, &request_id, "commit", closing_owner).await,
            Ok(true)
        ) {
            log::warn!("窗口 {} 未回复关闭提交，将按已确认决定销毁", window.label());
        }
    }
    if only_window.is_none() {
        ALLOW_EXIT.store(true, Ordering::SeqCst);
        app.exit(0);
    } else {
        for window in windows {
            window.destroy().map_err(|error| error.to_string())?;
        }
    }
    Ok(true)
}

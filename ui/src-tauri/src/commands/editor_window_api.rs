use crate::setup::{
    editor_window_sessions::EditorWindowBootstrap,
    window_runtime::{EDITOR_WINDOW_SESSIONS, WINDOW_SESSIONS},
};
use serde_json::Value;
use tauri::{Emitter, Manager, WebviewWindow};

#[tauri::command]
pub fn begin_editor_tab_drag(
    window: WebviewWindow,
    token: String,
    editor_id: String,
) -> Result<(), String> {
    EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .begin_tab_drag(window.label(), token, editor_id)
}
#[tauri::command]
pub fn take_editor_tab_drag(
    window: WebviewWindow,
    token: String,
    target_window_label: String,
) -> Result<(String, String), String> {
    EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .take_tab_drag(window.label(), &target_window_label, &token)
}

#[tauri::command]
pub async fn get_editor_window_bootstrap(
    window: WebviewWindow,
) -> Result<EditorWindowBootstrap, String> {
    let _gate = super::window_workspace_api::WORKSPACE_GATE.write().await;
    let mut sessions = EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if WINDOW_SESSIONS.start_cause(window.label()).is_some() {
        sessions.register_owner(window.label());
    }
    sessions.bootstrap(window.label())
}
#[tauri::command]
// Windows WebView 创建必须离开同步 command 的 UI 线程，否则 build 会等待自身而死锁。
pub async fn create_editor_window(
    window: WebviewWindow,
    transfer_id: String,
    payload: Value,
    owner_epoch: Option<u64>,
) -> Result<EditorWindowBootstrap, String> {
    log::info!(
        "创建辅助编辑器窗口：source={}, transfer={transfer_id}",
        window.label()
    );
    let result = tauri::async_runtime::spawn_blocking(move || {
        crate::setup::editor_window::create_editor_window(
            &window,
            &transfer_id,
            payload,
            owner_epoch,
        )
    })
    .await
    .map_err(|error| format!("创建辅助窗口任务失败：{error}"))?;
    if let Err(error) = &result {
        log::error!("创建辅助编辑器窗口失败：{error}");
    } else if let Ok(bootstrap) = &result {
        log::info!("辅助编辑器窗口已创建：target={}", bootstrap.window_label);
    }
    result
}
#[tauri::command]
pub fn show_editor_window(
    window: WebviewWindow,
    target_window_label: String,
    owner_epoch: Option<u64>,
) -> Result<(), String> {
    let mut sessions = EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.authorize_claim_epoch(window.label(), owner_epoch)?;
    // 只有 owner 可以提交初次显示。
    if window.label() != target_window_label {
        sessions.authorize_target(window.label(), &target_window_label)?;
        if sessions.is_editor(window.label()) {
            return Err("辅助窗口不能显示其他窗口".into());
        }
    } else if !sessions.is_editor(window.label()) {
        return Err("目标不是辅助编辑器窗口".into());
    }
    let target = window
        .app_handle()
        .get_webview_window(&target_window_label)
        .ok_or("辅助窗口已关闭")?;
    sessions.mark_shown(&target_window_label)?;
    if let Err(error) = target.show() {
        sessions.rollback_show(&target_window_label);
        return Err(error.to_string());
    }
    // show 已完成转移的可见性提交；焦点失败不能把成功显示误报为创建失败。
    let _ = target.set_focus();
    Ok(())
}
#[tauri::command]
pub fn send_editor_window_message(
    window: WebviewWindow,
    target_window_label: String,
    request_id: String,
    payload: Value,
    owner_epoch: u64,
) -> Result<(), String> {
    let sessions = EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    let kind = payload
        .get("kind")
        .and_then(Value::as_str)
        .unwrap_or("unknown")
        .to_owned();
    let method = payload
        .get("method")
        .and_then(Value::as_str)
        .unwrap_or("reply")
        .to_owned();
    let envelope = sessions.message(
        window.label(),
        &target_window_label,
        &request_id,
        payload,
        owner_epoch,
    ).map_err(|error| {
        // 只记录路由元数据，禁止把文档正文写入日志。
        log::warn!(
            "辅助窗口消息被拒绝：from={}, to={}, kind={kind}, method={method}, request={request_id}, epoch={owner_epoch}, reason={error}",
            window.label(), target_window_label
        );
        error
    })?;
    if window
        .app_handle()
        .get_webview_window(&target_window_label)
        .is_none()
    {
        return Err("目标编辑器窗口已关闭".into());
    }
    window
        .emit_to(
            tauri::EventTarget::webview_window(target_window_label),
            "lonanote://editor-window-message",
            envelope,
        )
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn store_editor_window_checkpoint(
    window: WebviewWindow,
    owner_epoch: u64,
    checkpoint: Value,
) -> Result<(), String> {
    EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .store_checkpoint(window.label(), owner_epoch, checkpoint)
}

#[tauri::command]
pub fn discard_editor_window(
    window: WebviewWindow,
    target_window_label: String,
    transfer_id: String,
    owner_epoch: Option<u64>,
) -> Result<(), String> {
    let mut sessions = EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.authorize_claim_epoch(window.label(), owner_epoch)?;
    sessions.reserve_discard(window.label(), &target_window_label, &transfer_id)?;
    let target = window
        .app_handle()
        .get_webview_window(&target_window_label)
        .ok_or("辅助窗口已关闭")?;
    // 销毁回调也要取得 session 锁，先交出锁再销毁；已显示标记只由owner显示命令设置。
    drop(sessions);
    target.destroy().map_err(|e| e.to_string())
}

use tauri::{Emitter, Manager, WebviewWindow};
#[cfg(not(windows))]
use tauri_plugin_dialog::{
    DialogExt, MessageDialogButtons, MessageDialogKind, MessageDialogResult,
};

#[tauri::command]
pub fn acquire_parent_input_lock(
    window: WebviewWindow,
    parent_request_id: Option<String>,
) -> Result<String, String> {
    let window = crate::setup::dialog_window::resolve_presentation_parent(
        &window,
        parent_request_id.as_deref(),
    )?;
    let was_enabled = window.is_enabled().map_err(|error| error.to_string())?;
    let lock = crate::setup::dialog_input_locks::DIALOG_INPUT_LOCKS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .acquire(window.label(), was_enabled);
    if lock.disable_window {
        if let Err(error) = window.set_enabled(false) {
            crate::setup::dialog_input_locks::DIALOG_INPUT_LOCKS
                .lock()
                .unwrap_or_else(|poison| poison.into_inner())
                .release(window.label(), &lock.token);
            return Err(error.to_string());
        }
    }
    Ok(lock.token)
}

#[tauri::command]
pub fn release_parent_input_lock(
    window: WebviewWindow,
    token: String,
    parent_request_id: Option<String>,
) -> Result<(), String> {
    let window = crate::setup::dialog_window::resolve_presentation_parent(
        &window,
        parent_request_id.as_deref(),
    )?;
    let should_enable = crate::setup::dialog_input_locks::DIALOG_INPUT_LOCKS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .release(window.label(), &token);
    if should_enable == Some(true) {
        window
            .set_enabled(true)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn create_dialog_window(
    window: WebviewWindow,
    request: crate::setup::dialog_window::CreateDialogWindow,
) -> Result<crate::setup::dialog_window::CreatedDialogWindow, String> {
    tauri::async_runtime::spawn_blocking(move || {
        crate::setup::dialog_window::create_dialog_window(&window, request)
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| format!("创建 Dialog 窗口任务失败：{error}"))?
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DialogWindowRequest {
    pub request_id: String,
    pub dialog_id: String,
    pub payload: serde_json::Value,
    pub block_parent_input: bool,
    pub title: String,
}

#[tauri::command]
pub fn get_dialog_window_request(
    window: WebviewWindow,
    request_id: String,
) -> Result<DialogWindowRequest, String> {
    let session = crate::setup::dialog_window::get_dialog_request(&window, &request_id)?;
    Ok(DialogWindowRequest {
        request_id: session.request_id,
        dialog_id: session.dialog_id,
        payload: session.payload,
        block_parent_input: session.block_parent_input,
        title: session.title,
    })
}

#[tauri::command]
pub fn get_dialog_workbench_label(window: WebviewWindow) -> Result<String, String> {
    let label = crate::setup::dialog_window::owner_for_dialog_window(window.label())
        .unwrap_or_else(|| window.label().to_owned());
    let label = crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .owner_of(&label)
        .map(str::to_owned)
        .unwrap_or(label);
    if crate::setup::window_runtime::WINDOW_SESSIONS
        .start_cause(&label)
        .is_none()
    {
        return Err("所属工作台窗口已关闭".into());
    }
    Ok(label)
}

#[tauri::command]
pub fn publish_dialog_view(
    window: WebviewWindow,
    request_id: String,
    data: serde_json::Value,
) -> Result<(), String> {
    let session = crate::setup::window_runtime::DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .owned_request(&request_id, window.label())?;
    if session.dialog_id != "workspace.select" {
        return Err("此 Dialog 不支持交互视图".into());
    }
    let target = window
        .app_handle()
        .get_webview_window(&session.window_label)
        .ok_or("Dialog 已关闭")?;
    target
        .emit(
            "lonanote://dialog-view",
            serde_json::json!({"requestId": request_id, "data": data}),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn dispatch_dialog_action(
    window: WebviewWindow,
    request_id: String,
    data: serde_json::Value,
) -> Result<(), String> {
    let session = crate::setup::dialog_window::get_dialog_request(&window, &request_id)?;
    if session.dialog_id != "workspace.select" {
        return Err("此 Dialog 不支持交互视图".into());
    }
    let target = window
        .app_handle()
        .get_webview_window(&session.owner_label)
        .ok_or("父窗口已关闭")?;
    target
        .emit(
            "lonanote://dialog-action",
            serde_json::json!({"requestId": request_id, "data": data}),
        )
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn complete_dialog_window(
    window: WebviewWindow,
    request_id: String,
    result: Option<serde_json::Value>,
) -> Result<(), String> {
    crate::setup::dialog_window::complete_dialog_window(&window, &request_id, result)
}

#[tauri::command]
pub fn dismiss_owned_dialog(window: WebviewWindow, request_id: String) -> Result<(), String> {
    let session = crate::setup::window_runtime::DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .owned_request(&request_id, window.label())?;
    if let Some(target) = window
        .app_handle()
        .get_webview_window(&session.window_label)
    {
        crate::setup::dialog_window::complete_dialog_window(&target, &request_id, None)?;
    }
    Ok(())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum NativeMessageKind {
    Info,
    Warning,
    Error,
}

#[derive(serde::Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum NativeMessageButtons {
    Ok {
        ok: String,
    },
    OkCancel {
        ok: String,
        cancel: String,
    },
    YesNoCancel {
        yes: String,
        no: String,
        cancel: String,
    },
}

#[tauri::command]
pub async fn show_native_message(
    window: WebviewWindow,
    title: String,
    message: String,
    kind: NativeMessageKind,
    buttons: NativeMessageButtons,
    parent_request_id: Option<String>,
) -> Result<String, String> {
    let window = crate::setup::dialog_window::resolve_presentation_parent(
        &window,
        parent_request_id.as_deref(),
    )?;
    #[cfg(windows)]
    {
        tauri::async_runtime::spawn_blocking(move || {
            super::native_message_windows::show(&window, title, message, kind, buttons)
        })
        .await
        .map_err(|e| format!("显示原生警告失败：{e}"))?
    }
    #[cfg(not(windows))]
    {
        let mut dialog = window
            .dialog()
            .message(message)
            .title(title)
            .parent(&window);
        dialog = dialog.kind(match kind {
            NativeMessageKind::Info => MessageDialogKind::Info,
            NativeMessageKind::Warning => MessageDialogKind::Warning,
            NativeMessageKind::Error => MessageDialogKind::Error,
        });
        dialog = dialog.buttons(match buttons {
            NativeMessageButtons::Ok { ok } => MessageDialogButtons::OkCustom(ok),
            NativeMessageButtons::OkCancel { ok, cancel } => {
                MessageDialogButtons::OkCancelCustom(ok, cancel)
            }
            NativeMessageButtons::YesNoCancel { yes, no, cancel } => {
                MessageDialogButtons::YesNoCancelCustom(yes, no, cancel)
            }
        });
        Ok(match dialog.blocking_show_with_result() {
            MessageDialogResult::Yes => "yes".into(),
            MessageDialogResult::No => "no".into(),
            MessageDialogResult::Ok => "ok".into(),
            MessageDialogResult::Cancel => "cancel".into(),
            MessageDialogResult::Custom(label) => format!("custom:{label}"),
        })
    }
}

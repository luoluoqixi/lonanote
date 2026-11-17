use tauri::WebviewWindow;
use tauri_plugin_dialog::{
    DialogExt, MessageDialogButtons, MessageDialogKind, MessageDialogResult,
};

#[tauri::command]
pub fn acquire_parent_input_lock(window: WebviewWindow) -> Result<String, String> {
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
pub fn release_parent_input_lock(window: WebviewWindow, token: String) -> Result<(), String> {
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
    })
}

#[tauri::command]
pub fn complete_dialog_window(
    window: WebviewWindow,
    request_id: String,
    result: Option<serde_json::Value>,
) -> Result<(), String> {
    crate::setup::dialog_window::complete_dialog_window(&window, &request_id, result)
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
) -> Result<String, String> {
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

use super::{dialog_sessions::DialogWindowSession, window_runtime::DIALOG_SESSIONS};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use tauri::{Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDialogWindow {
    pub request_id: String,
    pub dialog_id: String,
    pub payload: Value,
    pub title: String,
    pub width: f64,
    pub height: f64,
    pub block_parent_input: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedDialogWindow {
    pub request_id: String,
    pub window_label: String,
}

fn centered_position(
    parent_position: PhysicalPosition<i32>,
    parent_size: tauri::PhysicalSize<u32>,
    dialog_size: tauri::PhysicalSize<u32>,
) -> PhysicalPosition<i32> {
    let centered_axis = |origin: i32, parent: u32, dialog: u32| {
        (i64::from(origin) + (i64::from(parent) - i64::from(dialog)) / 2)
            .clamp(i64::from(i32::MIN), i64::from(i32::MAX)) as i32
    };
    PhysicalPosition::new(
        centered_axis(parent_position.x, parent_size.width, dialog_size.width),
        centered_axis(parent_position.y, parent_size.height, dialog_size.height),
    )
}

fn center_dialog(window: &WebviewWindow, owner: Option<&WebviewWindow>) -> Result<()> {
    if let Some(owner) = owner {
        if let (Ok(parent_position), Ok(parent_size), Ok(dialog_size)) = (
            owner.outer_position(),
            owner.outer_size(),
            window.outer_size(),
        ) {
            if window
                .set_position(centered_position(parent_position, parent_size, dialog_size))
                .is_ok()
            {
                return Ok(());
            }
        }
    }
    window.center().context("Dialog 窗口居中失败")?;
    Ok(())
}

fn acquire_input_lock(owner: &WebviewWindow) -> Result<Option<String>> {
    let was_enabled = owner.is_enabled()?;
    let acquired = super::dialog_input_locks::DIALOG_INPUT_LOCKS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .acquire(owner.label(), was_enabled);
    if acquired.disable_window {
        if let Err(error) = owner.set_enabled(false) {
            super::dialog_input_locks::DIALOG_INPUT_LOCKS
                .lock()
                .unwrap_or_else(|poison| poison.into_inner())
                .release(owner.label(), &acquired.token);
            return Err(error.into());
        }
    }
    Ok(Some(acquired.token))
}

fn release_input_lock(app: &tauri::AppHandle, session: &DialogWindowSession) {
    let Some(token) = session.input_lock_token.as_deref() else {
        return;
    };
    let should_enable = super::dialog_input_locks::DIALOG_INPUT_LOCKS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .release(&session.owner_label, token);
    if should_enable == Some(true) {
        if let Some(owner) = app.get_webview_window(&session.owner_label) {
            if let Err(error) = owner.set_enabled(true) {
                log::warn!(
                    "恢复 Dialog 父窗口输入失败：{}：{error}",
                    session.owner_label
                );
            }
        }
    }
}

fn notify_completion(app: &tauri::AppHandle, session: &DialogWindowSession, result: Option<Value>) {
    if let Some(owner) = app.get_webview_window(&session.owner_label) {
        if let Err(error) = owner.emit(
            "lonanote://dialog-window-result",
            serde_json::json!({ "requestId": session.request_id, "result": result }),
        ) {
            log::warn!("回传 Dialog 结果失败：{}：{error}", session.request_id);
        }
    }
    release_input_lock(app, session);
}

pub(crate) fn create_dialog_window(
    owner: &WebviewWindow,
    request: CreateDialogWindow,
) -> Result<CreatedDialogWindow> {
    anyhow::ensure!(!request.request_id.is_empty(), "Dialog 请求标识不能为空");
    anyhow::ensure!(!request.dialog_id.is_empty(), "Dialog 类型不能为空");
    anyhow::ensure!(
        request.width.is_finite() && request.height.is_finite(),
        "Dialog 尺寸无效"
    );
    let app = owner.app_handle();
    if request.dialog_id == "settings" {
        let existing = DIALOG_SESSIONS
            .lock()
            .unwrap_or_else(|poison| poison.into_inner())
            .find_owner_dialog(owner.label(), "settings");
        if let Some(existing) = existing {
            if let Some(window) = app.get_webview_window(&existing.window_label) {
                let _ = window.show();
                let _ = window.set_focus();
                return Ok(CreatedDialogWindow {
                    request_id: existing.request_id,
                    window_label: existing.window_label,
                });
            }
            if let Some(stale) = DIALOG_SESSIONS
                .lock()
                .unwrap_or_else(|poison| poison.into_inner())
                .remove_request(&existing.request_id)
            {
                release_input_lock(&app, &stale);
            }
        }
    }
    let label = format!("dialog-window-{}", uuid::Uuid::new_v4());
    let lock_token = if request.block_parent_input {
        acquire_input_lock(owner)?
    } else {
        None
    };
    let session = DialogWindowSession {
        request_id: request.request_id.clone(),
        dialog_id: request.dialog_id,
        owner_label: owner.label().to_owned(),
        window_label: label.clone(),
        payload: request.payload,
        block_parent_input: request.block_parent_input,
        input_lock_token: lock_token,
    };

    let insert_result = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|poison| poison.into_inner())
        .insert(session.clone());
    if let Err(error) = insert_result {
        release_input_lock(&app, &session);
        return Err(anyhow::Error::msg(error));
    }
    let created: Result<WebviewWindow> = (|| {
        let mut config = app
            .config()
            .app
            .windows
            .iter()
            .find(|config| config.label == crate::MAIN_WINDOW_NAME)
            .context("找不到 Dialog 窗口模板")?
            .clone();
        config.label = label.clone();
        config.visible = false;
        config.maximized = false;
        config.fullscreen = false;
        config.decorations = true;
        let route = PathBuf::from("dialog").join(&request.request_id);
        config.url = WebviewUrl::App(route);
        let window = WebviewWindowBuilder::from_config(app, &config)?
            .title(request.title)
            .inner_size(
                request.width.clamp(320.0, 1400.0),
                request.height.clamp(220.0, 1000.0),
            )
            .resizable(true)
            .visible(false)
            .focused(true)
            .parent(owner)?
            .build()?;
        Ok(window)
    })();
    let window = match created {
        Ok(window) => window,
        Err(error) => {
            DIALOG_SESSIONS
                .lock()
                .unwrap_or_else(|poison| poison.into_inner())
                .remove_request(&session.request_id);
            release_input_lock(&app, &session);
            return Err(error).context("创建 Dialog 窗口失败");
        }
    };
    if let Err(error) = center_dialog(&window, Some(owner)) {
        let _ = window.destroy();
        DIALOG_SESSIONS
            .lock()
            .unwrap_or_else(|poison| poison.into_inner())
            .remove_request(&session.request_id);
        release_input_lock(&app, &session);
        return Err(error).context("定位 Dialog 窗口失败");
    }
    let event_app = app.clone();
    let event_label = label.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            let removed = DIALOG_SESSIONS
                .lock()
                .unwrap_or_else(|error| error.into_inner())
                .remove_window(&event_label);
            if let Some(session) = removed {
                notify_completion(&event_app, &session, None);
            }
        }
    });
    if let Err(error) = window.show() {
        let _ = window.destroy();
        if let Some(session) = DIALOG_SESSIONS
            .lock()
            .unwrap_or_else(|poison| poison.into_inner())
            .remove_window(&label)
        {
            notify_completion(&app, &session, None);
        }
        return Err(error).context("显示 Dialog 窗口失败");
    }
    let _ = window.set_focus();
    Ok(CreatedDialogWindow {
        request_id: request.request_id,
        window_label: label,
    })
}

#[cfg(test)]
mod tests {
    use super::centered_position;
    use tauri::{PhysicalPosition, PhysicalSize};

    #[test]
    fn dialog_is_centered_in_parent_bounds() {
        assert_eq!(
            centered_position(
                PhysicalPosition::new(100, 200),
                PhysicalSize::new(1000, 800),
                PhysicalSize::new(400, 300),
            ),
            PhysicalPosition::new(400, 450),
        );
    }

    #[test]
    fn parent_centering_keeps_negative_monitor_coordinates() {
        assert_eq!(
            centered_position(
                PhysicalPosition::new(-1600, -100),
                PhysicalSize::new(1200, 900),
                PhysicalSize::new(600, 500),
            ),
            PhysicalPosition::new(-1300, 100),
        );
    }
}

pub(crate) fn get_dialog_request(
    window: &WebviewWindow,
    request_id: &str,
) -> Result<DialogWindowSession, String> {
    DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .request(request_id, window.label())
}

pub(crate) fn complete_dialog_window(
    window: &WebviewWindow,
    request_id: &str,
    result: Option<Value>,
) -> Result<(), String> {
    let session = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .complete(request_id, window.label())?;
    notify_completion(&window.app_handle(), &session, result);
    window.destroy().map_err(|error| error.to_string())
}

pub(crate) fn close_dialogs_for_owner(app: &tauri::AppHandle, owner_label: &str) {
    let sessions = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .remove_owner(owner_label);
    for session in sessions {
        if let Some(window) = app.get_webview_window(&session.window_label) {
            let _ = window.destroy();
        }
        release_input_lock(app, &session);
    }
}

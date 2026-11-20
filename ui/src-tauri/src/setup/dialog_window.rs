use super::{
    dialog_sessions::{dialog_entry_path, DialogRegistration, DialogWindowSession},
    window_runtime::DIALOG_SESSIONS,
};
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
    pub parent_request_id: Option<String>,
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
        .release(&session.parent_label, token);
    if should_enable == Some(true) {
        if let Some(owner) = app.get_webview_window(&session.parent_label) {
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

fn discard_cancelled_creation(window: &WebviewWindow, session: &DialogWindowSession) -> bool {
    let app = window.app_handle();
    let live = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .request(&session.request_id, &session.window_label)
        .is_ok();
    let allowed = lonanote_core::api::store::common_get("ui.window.nativeDialogs".into())
        .ok()
        .flatten()
        .and_then(|value| value.as_bool())
        != Some(false);
    if live
        && allowed
        && app.get_webview_window(&session.owner_label).is_some()
        && app.get_webview_window(&session.parent_label).is_some()
    {
        return false;
    }
    let removed = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .remove_request(&session.request_id);
    if let Some(removed) = removed {
        notify_completion(
            app,
            &removed,
            Some(serde_json::json!({ "__dialogDismissed": true })),
        );
    }
    let _ = window.destroy();
    true
}

pub(crate) fn create_dialog_window(
    owner: &WebviewWindow,
    request: CreateDialogWindow,
) -> Result<CreatedDialogWindow> {
    anyhow::ensure!(!request.request_id.is_empty(), "Dialog 请求标识不能为空");
    anyhow::ensure!(!request.dialog_id.is_empty(), "Dialog 类型不能为空");
    let entry_path = dialog_entry_path(&request.dialog_id).context("Dialog 类型没有独立入口")?;
    anyhow::ensure!(
        request.width.is_finite() && request.height.is_finite(),
        "Dialog 尺寸无效"
    );
    let app = owner.app_handle();
    let label = format!("dialog-window-{}", uuid::Uuid::new_v4());
    if lonanote_core::api::store::common_get("ui.window.nativeDialogs".into())
        .ok()
        .flatten()
        .and_then(|value| value.as_bool())
        == Some(false)
    {
        // 偏好关闭属于主动取消，不能作为创建失败再次弹出应用内 fallback。
        owner.emit(
            "lonanote://dialog-window-result",
            serde_json::json!({
                "requestId": request.request_id,
                "result": { "__dialogDismissed": true },
            }),
        )?;
        return Ok(CreatedDialogWindow {
            request_id: request.request_id,
            window_label: label,
        });
    }
    let parent = resolve_presentation_parent(owner, request.parent_request_id.as_deref())
        .map_err(anyhow::Error::msg)?;
    let lock_token = if request.block_parent_input {
        acquire_input_lock(&parent)?
    } else {
        None
    };
    let session = DialogWindowSession {
        request_id: request.request_id.clone(),
        dialog_id: request.dialog_id,
        owner_label: owner.label().to_owned(),
        parent_label: parent.label().to_owned(),
        window_label: label.clone(),
        payload: request.payload,
        title: request.title.clone(),
        block_parent_input: request.block_parent_input,
        input_lock_token: lock_token,
    };

    let insert_result = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|poison| poison.into_inner())
        .register(session.clone());
    match insert_result {
        Ok(DialogRegistration::Created(replaced)) => {
            for old in replaced {
                notify_completion(
                    app,
                    &old,
                    Some(serde_json::json!({ "__dialogDismissed": true })),
                );
                if let Some(window) = app.get_webview_window(&old.window_label) {
                    let _ = window.destroy();
                }
            }
        }
        Ok(DialogRegistration::Existing(existing)) => {
            release_input_lock(app, &session);
            if let Some(window) = app.get_webview_window(&existing.window_label) {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.set_focus();
                }
            }
            return Ok(CreatedDialogWindow {
                request_id: existing.request_id,
                window_label: existing.window_label,
            });
        }
        Err(error) => {
            release_input_lock(app, &session);
            return Err(anyhow::Error::msg(error));
        }
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
        config.decorations = cfg!(target_os = "macos");
        config.skip_taskbar = false;
        #[cfg(target_os = "macos")]
        {
            config.title_bar_style = tauri::TitleBarStyle::Overlay;
            config.hidden_title = true;
        }
        config.url = WebviewUrl::App(PathBuf::from(entry_path));
        let builder = WebviewWindowBuilder::from_config(app, &config)?
            .title(request.title)
            .inner_size(
                request.width.clamp(320.0, 1400.0),
                request.height.clamp(220.0, 1000.0),
            )
            .resizable(true)
            .skip_taskbar(false)
            .visible(false)
            .focused(true)
            .initialization_script(format!(
                "Object.defineProperty(window, '__LONANOTE_DIALOG_REQUEST_ID__', {{ value: {} }});",
                serde_json::to_string(&request.request_id)?
            ))
            .initialization_script_for_all_frames(
                "window.addEventListener('contextmenu', (event) => event.preventDefault());",
            );
        // Tao 的 OwnedBy 分支不保留 ON_TASKBAR；show/resize 会覆盖手动添加的 APPWINDOW。
        // Windows 先按顶级任务栏窗口创建，再设置真实 owner，让 Tao 的样式状态保持一致。
        #[cfg(not(windows))]
        let builder = builder.parent(&parent)?;
        let window = builder.build()?;
        #[cfg(windows)]
        if let Err(error) = attach_dialog_owner(&window, &parent) {
            let _ = window.destroy();
            return Err(error);
        }
        Ok(window)
    })();
    let window = match created {
        Ok(window) => window,
        Err(error) => {
            DIALOG_SESSIONS
                .lock()
                .unwrap_or_else(|poison| poison.into_inner())
                .remove_request(&session.request_id);
            release_input_lock(app, &session);
            return Err(error).context("创建 Dialog 窗口失败");
        }
    };
    let receipt = CreatedDialogWindow {
        request_id: request.request_id.clone(),
        window_label: label.clone(),
    };
    // build 期间配置/owner 销毁可能已经撤销请求；窗口此时已注册，后续关闭能找到它。
    if discard_cancelled_creation(&window, &session) {
        return Ok(receipt);
    }
    if let Err(error) = center_dialog(&window, Some(&parent)) {
        if discard_cancelled_creation(&window, &session) {
            return Ok(receipt);
        }
        let _ = window.destroy();
        DIALOG_SESSIONS
            .lock()
            .unwrap_or_else(|poison| poison.into_inner())
            .remove_request(&session.request_id);
        release_input_lock(app, &session);
        return Err(error).context("定位 Dialog 窗口失败");
    }
    let event_app = app.clone();
    let event_label = label.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            close_dialogs_for_owner(&event_app, &event_label);
            super::dialog_input_locks::DIALOG_INPUT_LOCKS
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .window_destroyed(&event_label);
            let removed = DIALOG_SESSIONS
                .lock()
                .unwrap_or_else(|error| error.into_inner())
                .remove_window(&event_label);
            if let Some(session) = removed {
                notify_completion(&event_app, &session, None);
            }
        }
    });
    if discard_cancelled_creation(&window, &session) {
        return Ok(receipt);
    }
    let present = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .mark_built(&session.request_id)
        .unwrap_or(false);
    if present {
        present_dialog(&window, &session).map_err(anyhow::Error::msg)?;
    }
    // bundle 未加载、配置失败或 renderer 未提交时也必须解锁父窗口并触发应用内 fallback。
    let timeout_app = app.clone();
    let timeout_id = session.request_id.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(30)).await;
        let expired = DIALOG_SESSIONS
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .expire_pending(&timeout_id);
        if let Some(session) = expired {
            close_dialogs_for_owner(&timeout_app, &session.window_label);
            notify_completion(
                &timeout_app,
                &session,
                Some(serde_json::json!({ "__dialogRendererFailure": true })),
            );
            if let Some(window) = timeout_app.get_webview_window(&session.window_label) {
                let _ = window.destroy();
            }
        }
    });
    Ok(receipt)
}

fn present_dialog(window: &WebviewWindow, session: &DialogWindowSession) -> Result<(), String> {
    if discard_cancelled_creation(window, session) {
        return Ok(());
    }
    let app = window.app_handle();
    let parent = app.get_webview_window(&session.parent_label);
    let result = center_dialog(window, parent.as_ref())
        .and_then(|_| window.show().context("显示 Dialog 窗口失败"));
    if let Err(error) = result {
        let removed = DIALOG_SESSIONS
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove_request(&session.request_id);
        if let Some(session) = removed {
            notify_completion(
                app,
                &session,
                Some(serde_json::json!({ "__dialogRendererFailure": true })),
            );
        }
        let _ = window.destroy();
        return Err(error.to_string());
    }
    let _ = window.set_focus();
    #[cfg(any(windows, target_os = "linux"))]
    if let Err(error) = window.set_skip_taskbar(false) {
        log::warn!("设置 Dialog 任务栏展示失败：{}：{error}", window.label());
    }
    Ok(())
}

pub(crate) fn ready_dialog_window(window: &WebviewWindow, request_id: &str) -> Result<(), String> {
    let (session, present) = {
        let mut sessions = DIALOG_SESSIONS.lock().unwrap_or_else(|e| e.into_inner());
        let session = sessions.request(request_id, window.label())?;
        let present = sessions.mark_ready(request_id, window.label())?;
        (session, present)
    };
    if present {
        present_dialog(window, &session)?;
    }
    Ok(())
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

pub(crate) fn owner_for_dialog_window(window_label: &str) -> Option<String> {
    let owner = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .owner_for_window(window_label)?;
    let workbench = super::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .owner_of(&owner)
        .map(str::to_owned)
        .unwrap_or(owner);
    Some(workbench)
}

pub(crate) fn resolve_presentation_parent(
    owner: &WebviewWindow,
    request_id: Option<&str>,
) -> Result<WebviewWindow, String> {
    let Some(request_id) = request_id else {
        return Ok(owner.clone());
    };
    let session = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .owned_request(request_id, owner.label())?;
    owner
        .app_handle()
        .get_webview_window(&session.window_label)
        .ok_or_else(|| "Dialog 父窗口已关闭".into())
}

pub(crate) fn complete_dialog_window(
    window: &WebviewWindow,
    request_id: &str,
    result: Option<Value>,
) -> Result<(), String> {
    close_dialogs_for_owner(window.app_handle(), window.label());
    let session = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .complete(request_id, window.label())?;
    notify_completion(window.app_handle(), &session, result);
    window.destroy().map_err(|error| error.to_string())
}

pub(crate) fn close_dialogs_for_owner(app: &tauri::AppHandle, owner_label: &str) {
    let sessions = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .remove_owner(owner_label);
    for session in sessions {
        notify_completion(app, &session, None);
        if let Some(window) = app.get_webview_window(&session.window_label) {
            let _ = window.destroy();
        }
    }
}

pub(crate) fn close_all_dialogs(app: &tauri::AppHandle) {
    let sessions = DIALOG_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .remove_all();
    for session in sessions {
        notify_completion(
            app,
            &session,
            Some(serde_json::json!({ "__dialogDismissed": true })),
        );
        if let Some(window) = app.get_webview_window(&session.window_label) {
            let _ = window.destroy();
        }
    }
}

#[cfg(windows)]
fn attach_dialog_owner(window: &WebviewWindow, parent: &WebviewWindow) -> Result<()> {
    super::dialog_window_parent::attach_owner(window.hwnd()?, parent.hwnd()?)
        .context("设置 Dialog 父窗口失败")
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

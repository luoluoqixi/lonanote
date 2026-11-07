use super::{
    editor_window_sessions::EditorWindowBootstrap, window_runtime::EDITOR_WINDOW_SESSIONS,
};
use anyhow::{Context, Result};
use serde_json::Value;
use tauri::{Emitter, Manager, WebviewWindow, WebviewWindowBuilder};

pub fn create_editor_window(
    owner: &WebviewWindow,
    transfer_id: &str,
    payload: Value,
    owner_epoch: Option<u64>,
) -> Result<EditorWindowBootstrap, String> {
    create(owner, transfer_id, payload, owner_epoch).map_err(|error| error.to_string())
}
fn create(
    owner: &WebviewWindow,
    transfer_id: &str,
    payload: Value,
    owner_epoch: Option<u64>,
) -> Result<EditorWindowBootstrap> {
    let _gate = super::window_close::WINDOW_LIFECYCLE_GATE
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    anyhow::ensure!(
        !super::window_close::CLOSE_ACTIVE.load(std::sync::atomic::Ordering::SeqCst),
        "正在确认窗口关闭，请稍后重试"
    );
    let label = format!("editor-window-{}", uuid::Uuid::new_v4());
    let bootstrap = {
        let mut sessions = EDITOR_WINDOW_SESSIONS
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        sessions
            .authorize_claim_epoch(owner.label(), owner_epoch)
            .map_err(anyhow::Error::msg)?;
        sessions
            .create(owner.label(), transfer_id, &label, payload)
            .map_err(anyhow::Error::msg)?
    };
    if bootstrap.window_label != label {
        return Ok(bootstrap);
    }
    let app = owner.app_handle();
    let created: Result<WebviewWindow> = (|| {
        let mut config = app
            .config()
            .app
            .windows
            .iter()
            .find(|config| config.label == crate::MAIN_WINDOW_NAME)
            .context("找不到编辑器窗口模板")?
            .clone();
        config.label = label.clone();
        config.drag_drop_enabled = cfg!(target_os = "linux");
        config.maximized = false;
        config.fullscreen = false;
        config.decorations = true;
        config.visible = false;
        let window = WebviewWindowBuilder::from_config(app, &config)?
            .title(crate::APP_TITLE.as_str())
            .visible(false)
            .decorations(true)
            .initialization_script_for_all_frames(super::external_file_drop::initialization_script(app))
            .initialization_script_for_all_frames(
                "window.addEventListener('contextmenu', (event) => event.preventDefault());",
            )
            .build()?;
        super::external_file_drop::install(&window)?;
        Ok(window)
    })();
    let window = match created {
        Ok(window) => window,
        Err(error) => {
            EDITOR_WINDOW_SESSIONS
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .remove_if_epoch(&label, bootstrap.owner_epoch);
            return Err(error).context("创建辅助编辑器窗口失败");
        }
    };
    let close_app = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let app = close_app.clone();
            let label = label.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = super::window_close::request_close(app, Some(label)).await {
                    log::error!("关闭辅助编辑器窗口失败：{error}");
                }
            });
        }
        if matches!(event, tauri::WindowEvent::Destroyed) {
            super::window_close::cleanup_window(&label);
            crate::commands::window_callbacks::cleanup_callbacks(&label);
            let mut sessions = EDITOR_WINDOW_SESSIONS
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if let Some(message) = sessions.member_lifecycle(&label, None) {
                if let Err(error) = close_app.emit_to(
                    tauri::EventTarget::webview_window(&message.owner_window_label),
                    "lonanote://editor-window-member-destroyed",
                    &message,
                ) {
                    log::warn!("通知原工作台辅助编辑器销毁失败：{error}");
                }
            }
            if let Some(epoch) = sessions.epoch(&label) {
                sessions.remove_if_epoch(&label, epoch);
            }
        }
    });
    Ok(bootstrap)
}

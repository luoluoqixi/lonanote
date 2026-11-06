use crate::setup::{window_runtime::WINDOW_SESSIONS, window_sessions::WindowStartCause};
use tauri::{Manager, WebviewWindow};

#[tauri::command]
pub async fn create_workspace_window(window: WebviewWindow) -> Result<String, String> {
    if crate::setup::window_close::CLOSE_ACTIVE.load(std::sync::atomic::Ordering::SeqCst) {
        return Err("正在确认窗口关闭，请稍后重试".to_string());
    }
    if WINDOW_SESSIONS.start_cause(window.label()).is_none() {
        return Err("当前窗口尚未注册工作台会话".to_string());
    }
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?;
    let label = format!("workspace-window-{}", uuid::Uuid::new_v4());
    crate::setup::window::create_workspace_window(window.app_handle(), &label, monitor)
        .map_err(|error| error.to_string())?;
    Ok(label)
}

#[tauri::command]
pub fn get_window_bootstrap(window: WebviewWindow) -> Result<WindowStartCause, String> {
    WINDOW_SESSIONS
        .start_cause(window.label())
        .ok_or_else(|| "未知的工作台窗口".to_string())
}

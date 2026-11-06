use std::sync::{LazyLock, Mutex};
use tauri::{AppHandle, Manager};

use super::launch_requests::LaunchRequests;

static LAUNCH_REQUESTS: LazyLock<Mutex<LaunchRequests>> =
    LazyLock::new(|| Mutex::new(LaunchRequests::default()));

pub fn request_new_window(app: &AppHandle) {
    let count = LAUNCH_REQUESTS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .request();
    create_windows(app, count);
}

pub fn ready(app: &AppHandle) {
    let count = LAUNCH_REQUESTS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .ready();
    create_windows(app, count);
}

fn create_windows(app: &AppHandle, count: usize) {
    if count == 0 {
        return;
    }
    let app = app.clone();
    // 窗口工厂可能等待主线程，不在单实例 IPC 回调或 RunEvent 内直接创建。
    tauri::async_runtime::spawn(async move {
        for _ in 0..count {
            let monitor = app
                .webview_windows()
                .into_values()
                .find(|window| window.is_focused().unwrap_or(false))
                .and_then(|window| window.current_monitor().ok().flatten());
            let label = format!("workspace-window-{}", uuid::Uuid::new_v4());
            match super::window::create_workspace_window(&app, &label, monitor) {
                Ok(window) => {
                    // 仅响应本次主动启动请求，后续不持续抢占焦点。
                    if let Err(error) = window.set_focus() {
                        log::warn!("重复启动后聚焦新窗口失败：{error}");
                    }
                }
                Err(error) => log::error!("重复启动后新建工作台窗口失败：{error}"),
            }
        }
    });
}

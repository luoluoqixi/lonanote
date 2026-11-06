use crate::setup::{window_runtime::WINDOW_SESSIONS, window_sessions::WindowBootstrap};
use tauri::{Manager, WebviewWindow};

#[tauri::command]
pub async fn create_workspace_window(
    window: WebviewWindow,
    workspace_id: Option<lonanote_core::workspace::WorkspaceId>,
) -> Result<String, String> {
    if crate::setup::window_close::CLOSE_ACTIVE.load(std::sync::atomic::Ordering::SeqCst) {
        return Err("正在确认窗口关闭，请稍后重试".to_string());
    }
    if WINDOW_SESSIONS.start_cause(window.label()).is_none() {
        return Err("当前窗口尚未注册工作台会话".to_string());
    }
    let monitor = window
        .current_monitor()
        .map_err(|error| error.to_string())?;
    let _guard = super::window_workspace_api::WORKSPACE_GATE.write().await;
    if let Some(id) = workspace_id {
        if let Some(owner) = WINDOW_SESSIONS.owner_of(id) {
            let target = window
                .app_handle()
                .get_webview_window(&owner)
                .ok_or("工作区所属窗口已关闭")?;
            target.unminimize().map_err(|e| e.to_string())?;
            target.show().map_err(|e| e.to_string())?;
            target.set_focus().map_err(|e| e.to_string())?;
            return Ok(owner);
        }
    }
    let label = format!("workspace-window-{}", uuid::Uuid::new_v4());
    let created =
        crate::setup::window::create_workspace_window(window.app_handle(), &label, monitor)
            .map_err(|error| error.to_string())?;
    if let Some(id) = workspace_id {
        let manager = lonanote_core::workspace::workspace_manager();
        let opened = crate::setup::workspace_window_launch::open_in_window(
            manager,
            &WINDOW_SESSIONS,
            &label,
            id,
        )
        .await;
        if let Err(error) = opened {
            WINDOW_SESSIONS.release_window(&label);
            let _ = created.destroy();
            return Err(error);
        }
        use tauri::Emitter;
        let _ = window.emit("lonanote://workspace-catalog-changed", ());
    }
    let _ = created.set_focus();
    Ok(label)
}

#[tauri::command]
pub async fn get_window_workspace(
    window: WebviewWindow,
) -> Option<lonanote_core::workspace::WorkspaceId> {
    let _guard = super::window_workspace_api::WORKSPACE_GATE.read().await;
    WINDOW_SESSIONS.current_workspace(window.label())
}

#[tauri::command]
pub async fn get_window_bootstrap(window: WebviewWindow) -> Result<WindowBootstrap, String> {
    let _guard = super::window_workspace_api::WORKSPACE_GATE.write().await;
    let bootstrap = WINDOW_SESSIONS
        .take_bootstrap(window.label())
        .ok_or_else(|| "未知的工作台窗口".to_string())?;
    // 旧 WebView 的编辑器已销毁，其文件 lease 不应阻止新前端重新打开笔记。
    // 只清理文件占用，保留当前窗口的 Core 工作区与其他窗口的全部状态。
    super::file_ownership_api::release_window(window.label());
    Ok(bootstrap)
}

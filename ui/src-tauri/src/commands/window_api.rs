use crate::setup::{window_runtime::WINDOW_SESSIONS, window_sessions::WindowBootstrap};
use tauri::{Manager, WebviewWindow};

#[tauri::command]
pub async fn refresh_current_window_title(window: WebviewWindow) -> Result<String, String> {
    let owner = crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .owner_of(window.label())
        .map(str::to_owned);
    let workspace_id = owner
        .as_deref()
        .and_then(|label| WINDOW_SESSIONS.current_workspace(label));
    let app_title = format!("露娜笔记 {}", crate::APP_VERSION);
    let title = if let Some(id) = workspace_id {
        let snapshot = lonanote_core::workspace::workspace_manager()
            .get_workspace(&id)
            .await
            .map_err(|e| e.to_string())?;
        format!("{} - {app_title}", snapshot.display_name)
    } else {
        app_title
    };
    window.set_title(&title).map_err(|e| e.to_string())?;
    Ok(title)
}

#[tauri::command]
pub fn set_current_window_background(window: WebviewWindow, color: String) -> Result<bool, String> {
    // 由 Tauri 注入调用窗口；辅助窗口只修改自身外观，不接受任意目标 label。
    crate::utils::win::set_win_bg_hex(&window, &color).map_err(|error| error.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn create_workspace_window(
    window: WebviewWindow,
    workspace_id: Option<lonanote_core::workspace::WorkspaceId>,
    owner_epoch: Option<u64>,
) -> Result<String, String> {
    if crate::setup::window_close::CLOSE_ACTIVE.load(std::sync::atomic::Ordering::SeqCst) {
        return Err("正在确认窗口关闭，请稍后重试".to_string());
    }
    if WINDOW_SESSIONS.start_cause(window.label()).is_none() {
        return Err("当前窗口尚未注册工作台会话".to_string());
    }
    crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .authorize_claim_epoch(window.label(), owner_epoch)?;
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
pub async fn get_window_bootstrap(
    window: WebviewWindow,
    owner_epoch: Option<u64>,
) -> Result<WindowBootstrap, String> {
    let _guard = super::window_workspace_api::WORKSPACE_GATE.write().await;
    crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .authorize_claim_epoch(window.label(), owner_epoch)?;
    let bootstrap = WINDOW_SESSIONS
        .take_bootstrap(window.label())
        .ok_or_else(|| "未知的工作台窗口".to_string())?;
    // 旧 WebView 的编辑器已销毁，其文件 lease 不应阻止新前端重新打开笔记。
    // 只清理文件占用，保留当前窗口的 Core 工作区与其他窗口的全部状态。
    let preserve_claims = crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .preserve_owner_claims(window.label());
    // 恢复记录中的文档仍由同一 owner 持有；新 renderer 按 documentId 原子更换 lease。
    if !preserve_claims {
        super::file_ownership_api::release_window(window.label());
    }
    Ok(bootstrap)
}

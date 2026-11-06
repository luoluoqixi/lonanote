use super::window_sessions::WindowSessions;
use lonanote_core::workspace::{WorkspaceId, WorkspaceManager};

/// 调用方持有 WORKSPACE_GATE 写锁，并已通过窗口工厂登记空白窗口。
pub async fn open_in_window(
    manager: &WorkspaceManager,
    sessions: &WindowSessions,
    label: &str,
    id: WorkspaceId,
) -> Result<(), String> {
    sessions
        .reserve_open(label, id)
        .map_err(|e| e.to_string())?;
    if let Err(error) = manager.open_workspace(&id).await {
        sessions.rollback_open(label, id);
        return Err(error.to_string());
    }
    if let Err(error) = sessions.commit_open(label, id) {
        let _ = manager.close_workspace(&id).await;
        sessions.rollback_open(label, id);
        return Err(error.to_string());
    }
    Ok(())
}

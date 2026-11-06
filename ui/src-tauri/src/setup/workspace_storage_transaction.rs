use super::{window_sessions::WindowSessions, workspace_access::check_workspace_access};
use lonanote_core::workspace::{StorageCleanupStatus, WorkspaceId, WorkspaceManager};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageChangeResult {
    pub was_open: bool,
    pub reopened: bool,
    pub reopen_error: Option<String>,
    pub source_cleanup: Option<StorageCleanupStatus>,
}

/// 调用方在整个 future 生命周期内持有 WORKSPACE_GATE 写锁。
/// 内部 Core close 不释放窗口归属，其他窗口在恢复结束前无法接管。
pub async fn change_storage<F, Fut>(
    manager: &WorkspaceManager,
    sessions: &WindowSessions,
    label: &str,
    id: WorkspaceId,
    change: F,
) -> Result<StorageChangeResult, String>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<Option<StorageCleanupStatus>, String>>,
{
    if sessions.start_cause(label).is_none() {
        return Err("窗口会话已结束".into());
    }
    check_workspace_access(sessions, label, "workspace.relocate", id)?;
    let was_open = manager.is_workspace_open(&id).await;
    if was_open && sessions.current_workspace(label) != Some(id) {
        return Err("该工作区未绑定到当前窗口".into());
    }
    if was_open {
        manager
            .close_workspace(&id)
            .await
            .map_err(|e| e.to_string())?;
    }
    let changed = change().await;
    let reopen_error = if was_open {
        manager
            .open_workspace(&id)
            .await
            .err()
            .map(|e| e.to_string())
    } else {
        None
    };
    if reopen_error.is_some() {
        sessions
            .release_workspace(label, id)
            .map_err(|e| e.to_string())?;
    }
    match changed {
        Ok(source_cleanup) => Ok(StorageChangeResult {
            was_open,
            reopened: was_open && reopen_error.is_none(),
            reopen_error,
            source_cleanup,
        }),
        Err(error) => Err(match reopen_error {
            Some(restore) => format!("{error}；恢复原工作区失败：{restore}"),
            None => error,
        }),
    }
}

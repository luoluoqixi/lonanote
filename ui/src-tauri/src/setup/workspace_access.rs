use super::window_sessions::WindowSessions;
use lonanote_core::workspace::WorkspaceId;

pub fn should_focus_workspace_owner(key: &str) -> bool {
    matches!(
        key,
        "workspace.open" | "workspace.open_with_diagnostics" | "workspace.resolve_id_mismatch"
    )
}

pub fn check_workspace_access(
    sessions: &WindowSessions,
    label: &str,
    key: &str,
    workspace_id: WorkspaceId,
) -> Result<(), String> {
    let owner = sessions.owner_of(workspace_id);
    // Catalog 元信息是共享投影，读取不能切换窗口或要求调用方拥有实例。
    if matches!(key, "workspace.get" | "workspace.is_open") {
        return Ok(());
    }
    if owner.as_deref().is_some_and(|owner| owner != label) {
        return Err("该工作区已在另一个窗口打开".to_string());
    }
    if (key.starts_with("workspace.file.") || key.starts_with("workspace.index."))
        && owner.as_deref() != Some(label)
    {
        return Err("当前窗口未打开该工作区".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_and_close_commands_reject_foreign_owner() {
        let sessions = WindowSessions::default();
        let id = WorkspaceId::new();
        sessions.register_window("a");
        sessions.register_window("b");
        sessions.reserve_open("a", id).unwrap();
        sessions.commit_open("a", id).unwrap();
        for key in [
            "workspace.close",
            "workspace.remove",
            "workspace.file.read_text",
            "workspace.index.refresh",
        ] {
            assert!(check_workspace_access(&sessions, "b", key, id).is_err());
            assert!(check_workspace_access(&sessions, "a", key, id).is_ok());
        }
    }

    #[test]
    fn unclaimed_workspace_allows_catalog_but_not_file_access() {
        let sessions = WindowSessions::default();
        let id = WorkspaceId::new();
        sessions.register_window("a");
        assert!(check_workspace_access(&sessions, "a", "workspace.get", id).is_ok());
        assert!(check_workspace_access(&sessions, "a", "workspace.file.write_text", id).is_err());
    }

    #[test]
    fn background_catalog_reads_never_focus_workspace_owner() {
        let sessions = WindowSessions::default();
        let id = WorkspaceId::new();
        sessions.register_window("a");
        sessions.register_window("b");
        sessions.reserve_open("a", id).unwrap();
        sessions.commit_open("a", id).unwrap();
        for key in ["workspace.get", "workspace.is_open"] {
            assert!(check_workspace_access(&sessions, "b", key, id).is_ok());
            assert!(!should_focus_workspace_owner(key));
        }
        assert!(!should_focus_workspace_owner("workspace.close"));
        assert!(should_focus_workspace_owner("workspace.open"));
    }
}

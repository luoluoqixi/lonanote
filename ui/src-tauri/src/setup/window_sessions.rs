use lonanote_core::workspace::WorkspaceId;
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Default)]
pub struct WindowSessions {
    state: Mutex<WindowSessionState>,
}

#[derive(Default)]
struct WindowSessionState {
    windows: HashMap<String, WindowSession>,
    owners: HashMap<WorkspaceId, String>,
}

#[derive(Default)]
struct WindowSession {
    start_cause: WindowStartCause,
    bootstrapped: bool,
    workspace_id: Option<WorkspaceId>,
    pending_workspace_id: Option<WorkspaceId>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum WindowStartCause {
    #[default]
    InitialLaunch,
    NewWindow,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowBootstrap {
    pub current_workspace_id: Option<WorkspaceId>,
    pub restore_last_workspace: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WindowSessionError {
    UnknownWindow(String),
    OpenPending(String),
    WorkspaceOwnedByWindow {
        workspace_id: WorkspaceId,
        owner_window: String,
    },
    ReservationMismatch {
        window: String,
        workspace_id: WorkspaceId,
    },
}

impl WindowSessionError {
    #[cfg(test)]
    pub fn owner_window(&self) -> &str {
        match self {
            Self::WorkspaceOwnedByWindow { owner_window, .. } => owner_window,
            _ => "",
        }
    }
}

impl std::fmt::Display for WindowSessionError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::UnknownWindow(window) => write!(formatter, "未知窗口：{window}"),
            Self::OpenPending(window) => write!(formatter, "窗口 {window} 正在打开工作区"),
            Self::WorkspaceOwnedByWindow { owner_window, .. } => {
                write!(formatter, "工作区已在另一个窗口打开（{owner_window}）")
            }
            Self::ReservationMismatch { window, .. } => {
                write!(formatter, "窗口 {window} 的工作区预占状态不匹配")
            }
        }
    }
}

impl WindowSessions {
    /// WebView 重载保留窗口归属；全局最近工作区仅用于主窗口第一次启动。
    pub fn take_bootstrap(&self, label: &str) -> Option<WindowBootstrap> {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        let session = state.windows.get_mut(label)?;
        let bootstrap = WindowBootstrap {
            current_workspace_id: session.workspace_id,
            restore_last_workspace: !session.bootstrapped
                && session.start_cause == WindowStartCause::InitialLaunch,
        };
        session.bootstrapped = true;
        Some(bootstrap)
    }

    #[cfg(test)]
    pub fn register_window(&self, label: impl Into<String>) {
        self.register_window_with_cause(label, WindowStartCause::InitialLaunch);
    }

    pub fn register_window_with_cause(
        &self,
        label: impl Into<String>,
        start_cause: WindowStartCause,
    ) {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        state.windows.entry(label.into()).or_default().start_cause = start_cause;
    }

    pub fn start_cause(&self, label: &str) -> Option<WindowStartCause> {
        self.state
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .windows
            .get(label)
            .map(|session| session.start_cause)
    }

    pub fn reserve_open(
        &self,
        label: &str,
        workspace_id: WorkspaceId,
    ) -> Result<(), WindowSessionError> {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        let session = state
            .windows
            .get(label)
            .ok_or_else(|| WindowSessionError::UnknownWindow(label.to_string()))?;

        if session.pending_workspace_id.is_some() {
            return Err(WindowSessionError::OpenPending(label.to_string()));
        }

        if session.workspace_id == Some(workspace_id) {
            return Ok(());
        }

        if let Some(owner_window) = state.owners.get(&workspace_id) {
            if owner_window != label {
                return Err(WindowSessionError::WorkspaceOwnedByWindow {
                    workspace_id,
                    owner_window: owner_window.clone(),
                });
            }
        }

        state.owners.insert(workspace_id, label.to_string());
        if let Some(session) = state.windows.get_mut(label) {
            session.pending_workspace_id = Some(workspace_id);
        }
        Ok(())
    }

    pub fn commit_open(
        &self,
        label: &str,
        workspace_id: WorkspaceId,
    ) -> Result<(), WindowSessionError> {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        let session = state
            .windows
            .get(label)
            .ok_or_else(|| WindowSessionError::UnknownWindow(label.to_string()))?;
        if session.workspace_id == Some(workspace_id) && session.pending_workspace_id.is_none() {
            return Ok(());
        }
        if session.pending_workspace_id != Some(workspace_id)
            || state.owners.get(&workspace_id).map(String::as_str) != Some(label)
        {
            return Err(WindowSessionError::ReservationMismatch {
                window: label.to_string(),
                workspace_id,
            });
        }

        let previous_workspace_id = state
            .windows
            .get(label)
            .and_then(|session| session.workspace_id);
        if let Some(previous_workspace_id) = previous_workspace_id {
            if state.owners.get(&previous_workspace_id).map(String::as_str) == Some(label) {
                state.owners.remove(&previous_workspace_id);
            }
        }
        if let Some(session) = state.windows.get_mut(label) {
            session.workspace_id = Some(workspace_id);
            session.pending_workspace_id = None;
        }
        Ok(())
    }

    pub fn rollback_open(&self, label: &str, workspace_id: WorkspaceId) {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        let is_pending = state
            .windows
            .get(label)
            .is_some_and(|session| session.pending_workspace_id == Some(workspace_id));
        if !is_pending {
            return;
        }

        if state.owners.get(&workspace_id).map(String::as_str) == Some(label) {
            state.owners.remove(&workspace_id);
        }
        if let Some(session) = state.windows.get_mut(label) {
            session.pending_workspace_id = None;
        }
    }

    pub fn release_window(&self, label: &str) {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        let Some(session) = state.windows.remove(label) else {
            return;
        };
        for workspace_id in [session.workspace_id, session.pending_workspace_id]
            .into_iter()
            .flatten()
        {
            if state.owners.get(&workspace_id).map(String::as_str) == Some(label) {
                state.owners.remove(&workspace_id);
            }
        }
    }

    pub fn owner_of(&self, workspace_id: WorkspaceId) -> Option<String> {
        self.state
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .owners
            .get(&workspace_id)
            .cloned()
    }

    pub fn current_workspace(&self, label: &str) -> Option<WorkspaceId> {
        self.state
            .lock()
            .unwrap_or_else(|error| error.into_inner())
            .windows
            .get(label)
            .and_then(|session| session.workspace_id)
    }

    pub fn release_workspace(
        &self,
        label: &str,
        workspace_id: WorkspaceId,
    ) -> Result<(), WindowSessionError> {
        let mut state = self.state.lock().unwrap_or_else(|error| error.into_inner());
        if let Some(owner) = state.owners.get(&workspace_id) {
            if owner != label {
                return Err(WindowSessionError::WorkspaceOwnedByWindow {
                    workspace_id,
                    owner_window: owner.clone(),
                });
            }
        }
        state.owners.remove(&workspace_id);
        if let Some(session) = state.windows.get_mut(label) {
            if session.workspace_id == Some(workspace_id) {
                session.workspace_id = None;
            }
            if session.pending_workspace_id == Some(workspace_id) {
                session.pending_workspace_id = None;
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use lonanote_core::workspace::WorkspaceId;
    use std::sync::{Arc, Barrier};

    #[test]
    fn reload_bootstrap_restores_only_its_window_and_never_reuses_global_last() {
        let sessions = WindowSessions::default();
        sessions.register_window("a");
        sessions.register_window_with_cause("b", WindowStartCause::NewWindow);
        assert!(sessions.take_bootstrap("a").unwrap().restore_last_workspace);
        assert!(!sessions.take_bootstrap("b").unwrap().restore_last_workspace);
        let a = WorkspaceId::new();
        let b = WorkspaceId::new();
        for (label, id) in [("a", a), ("b", b)] {
            sessions.reserve_open(label, id).unwrap();
            sessions.commit_open(label, id).unwrap();
            let bootstrap = sessions.take_bootstrap(label).unwrap();
            assert_eq!(bootstrap.current_workspace_id, Some(id));
            assert!(!bootstrap.restore_last_workspace);
        }
        sessions.release_workspace("a", a).unwrap();
        let empty_reload = sessions.take_bootstrap("a").unwrap();
        assert_eq!(empty_reload.current_workspace_id, None);
        assert!(!empty_reload.restore_last_workspace);
        assert!(sessions.take_bootstrap("unknown").is_none());
        assert_eq!(sessions.current_workspace("b"), Some(b));
    }

    #[test]
    fn pending_open_cannot_be_replaced_by_another_request() {
        let sessions = WindowSessions::default();
        let first = WorkspaceId::new();
        let second = WorkspaceId::new();
        sessions.register_window("window-a");
        sessions.reserve_open("window-a", first).unwrap();
        assert!(sessions.reserve_open("window-a", second).is_err());
        assert_eq!(sessions.owner_of(first).as_deref(), Some("window-a"));
        assert_eq!(sessions.owner_of(second), None);
    }

    #[test]
    fn cannot_release_foreign_workspace_or_commit_after_destroy() {
        let sessions = WindowSessions::default();
        let id = WorkspaceId::new();
        sessions.register_window("window-a");
        sessions.register_window("window-b");
        sessions.reserve_open("window-a", id).unwrap();
        sessions.commit_open("window-a", id).unwrap();
        assert!(sessions.release_workspace("window-b", id).is_err());
        assert_eq!(sessions.current_workspace("window-a"), Some(id));
        sessions.release_window("window-a");
        assert!(sessions.commit_open("window-a", id).is_err());
    }

    #[test]
    fn bootstrap_cause_stays_associated_with_window() {
        let sessions = WindowSessions::default();
        sessions.register_window("window-a");
        sessions.register_window_with_cause("window-b", WindowStartCause::NewWindow);
        assert_eq!(
            sessions.start_cause("window-a"),
            Some(WindowStartCause::InitialLaunch)
        );
        assert_eq!(
            sessions.start_cause("window-b"),
            Some(WindowStartCause::NewWindow)
        );
        assert_eq!(sessions.start_cause("unknown"), None);
    }

    #[test]
    fn claims_workspace_for_one_window() {
        let sessions = WindowSessions::default();
        let workspace_id = WorkspaceId::new();

        sessions.register_window("window-a");
        sessions.register_window("window-b");
        sessions.reserve_open("window-a", workspace_id).unwrap();
        sessions.commit_open("window-a", workspace_id).unwrap();

        assert_eq!(sessions.owner_of(workspace_id).as_deref(), Some("window-a"));
    }

    #[test]
    fn second_window_cannot_claim_owned_workspace() {
        let sessions = WindowSessions::default();
        let workspace_id = WorkspaceId::new();

        sessions.register_window("window-a");
        sessions.register_window("window-b");
        sessions.reserve_open("window-a", workspace_id).unwrap();
        sessions.commit_open("window-a", workspace_id).unwrap();

        let error = sessions.reserve_open("window-b", workspace_id).unwrap_err();
        assert_eq!(error.owner_window(), "window-a");
    }

    #[test]
    fn failed_open_rolls_back_reservation() {
        let sessions = WindowSessions::default();
        let workspace_id = WorkspaceId::new();

        sessions.register_window("window-a");
        sessions.register_window("window-b");
        sessions.reserve_open("window-a", workspace_id).unwrap();
        sessions.rollback_open("window-a", workspace_id);

        assert_eq!(sessions.owner_of(workspace_id), None);
        sessions.reserve_open("window-b", workspace_id).unwrap();
    }

    #[test]
    fn switch_commit_releases_only_previous_owner() {
        let sessions = WindowSessions::default();
        let first = WorkspaceId::new();
        let second = WorkspaceId::new();

        sessions.register_window("window-a");
        sessions.register_window("window-b");
        sessions.reserve_open("window-a", first).unwrap();
        sessions.commit_open("window-a", first).unwrap();
        sessions.reserve_open("window-b", second).unwrap();
        sessions.commit_open("window-b", second).unwrap();
        sessions.reserve_open("window-a", second).unwrap_err();
        sessions.rollback_open("window-a", first);

        let third = WorkspaceId::new();
        sessions.reserve_open("window-a", third).unwrap();
        sessions.commit_open("window-a", third).unwrap();

        assert_eq!(sessions.owner_of(first), None);
        assert_eq!(sessions.owner_of(second).as_deref(), Some("window-b"));
        assert_eq!(sessions.owner_of(third).as_deref(), Some("window-a"));
    }

    #[test]
    fn window_destroy_releases_its_workspace() {
        let sessions = WindowSessions::default();
        let workspace_id = WorkspaceId::new();

        sessions.register_window("window-a");
        sessions.reserve_open("window-a", workspace_id).unwrap();
        sessions.commit_open("window-a", workspace_id).unwrap();
        sessions.release_window("window-a");

        assert_eq!(sessions.owner_of(workspace_id), None);
    }

    #[test]
    fn closing_window_does_not_release_other_owner() {
        let sessions = WindowSessions::default();
        let workspace_a = WorkspaceId::new();
        let workspace_b = WorkspaceId::new();

        sessions.register_window("window-a");
        sessions.register_window("window-b");
        sessions.reserve_open("window-a", workspace_a).unwrap();
        sessions.commit_open("window-a", workspace_a).unwrap();
        sessions.reserve_open("window-b", workspace_b).unwrap();
        sessions.commit_open("window-b", workspace_b).unwrap();
        sessions.release_window("window-a");

        assert_eq!(sessions.owner_of(workspace_a), None);
        assert_eq!(sessions.owner_of(workspace_b).as_deref(), Some("window-b"));
    }

    #[test]
    fn concurrent_claims_allow_exactly_one_window() {
        let sessions = Arc::new(WindowSessions::default());
        let workspace_id = WorkspaceId::new();
        let barrier = Arc::new(Barrier::new(3));
        sessions.register_window("window-a");
        sessions.register_window("window-b");

        let claims = ["window-a", "window-b"].map(|label| {
            let sessions = Arc::clone(&sessions);
            let barrier = Arc::clone(&barrier);
            std::thread::spawn(move || {
                barrier.wait();
                sessions.reserve_open(label, workspace_id).is_ok()
            })
        });
        barrier.wait();

        let successful_claims = claims
            .into_iter()
            .map(|claim| claim.join().unwrap())
            .filter(|claimed| *claimed)
            .count();
        assert_eq!(successful_claims, 1);
    }
}

use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub(crate) struct DialogWindowSession {
    pub request_id: String,
    pub dialog_id: String,
    pub owner_label: String,
    pub window_label: String,
    pub payload: Value,
    pub block_parent_input: bool,
    pub input_lock_token: Option<String>,
}

#[derive(Default)]
pub(crate) struct DialogSessions {
    requests: HashMap<String, DialogWindowSession>,
    windows: HashMap<String, String>,
}

impl DialogSessions {
    pub(crate) fn find_owner_dialog(
        &self,
        owner_label: &str,
        dialog_id: &str,
    ) -> Option<DialogWindowSession> {
        self.requests
            .values()
            .find(|session| {
                session.owner_label == owner_label && session.dialog_id == dialog_id
            })
            .cloned()
    }

    pub(crate) fn insert(&mut self, session: DialogWindowSession) -> Result<(), String> {
        if self.requests.contains_key(&session.request_id)
            || self.windows.contains_key(&session.window_label)
        {
            return Err("Dialog 请求标识重复".into());
        }
        self.windows
            .insert(session.window_label.clone(), session.request_id.clone());
        self.requests.insert(session.request_id.clone(), session);
        Ok(())
    }

    pub(crate) fn request(
        &self,
        request_id: &str,
        caller: &str,
    ) -> Result<DialogWindowSession, String> {
        let session = self.requests.get(request_id).ok_or("Dialog 请求不存在")?;
        if session.window_label != caller {
            return Err("当前窗口无权读取此 Dialog 请求".into());
        }
        Ok(session.clone())
    }

    pub(crate) fn complete(
        &mut self,
        request_id: &str,
        caller: &str,
    ) -> Result<DialogWindowSession, String> {
        let session = self.requests.get(request_id).ok_or("Dialog 请求已结束")?;
        if session.window_label != caller {
            return Err("当前窗口无权结束此 Dialog 请求".into());
        }
        let session = self.requests.remove(request_id).expect("请求已确认存在");
        self.windows.remove(&session.window_label);
        Ok(session)
    }

    pub(crate) fn remove_window(&mut self, window_label: &str) -> Option<DialogWindowSession> {
        let request_id = self.windows.remove(window_label)?;
        self.requests.remove(&request_id)
    }

    pub(crate) fn remove_request(&mut self, request_id: &str) -> Option<DialogWindowSession> {
        let session = self.requests.remove(request_id)?;
        self.windows.remove(&session.window_label);
        Some(session)
    }

    pub(crate) fn remove_owner(&mut self, owner_label: &str) -> Vec<DialogWindowSession> {
        let request_ids: Vec<_> = self
            .requests
            .iter()
            .filter(|(_, session)| session.owner_label == owner_label)
            .map(|(request_id, _)| request_id.clone())
            .collect();
        request_ids
            .into_iter()
            .filter_map(|request_id| {
                let session = self.requests.remove(&request_id)?;
                self.windows.remove(&session.window_label);
                Some(session)
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::{DialogSessions, DialogWindowSession};
    use serde_json::json;

    fn session() -> DialogWindowSession {
        DialogWindowSession {
            request_id: "request-1".into(),
            dialog_id: "workspace.rename".into(),
            owner_label: "main".into(),
            window_label: "dialog-window-1".into(),
            payload: json!({ "name": "draft" }),
            block_parent_input: true,
            input_lock_token: Some("lock-1".into()),
        }
    }

    #[test]
    fn request_is_visible_only_to_its_dialog_window_and_completes_once() {
        let mut sessions = DialogSessions::default();
        sessions.insert(session()).unwrap();
        assert_eq!(
            sessions
                .request("request-1", "dialog-window-1")
                .unwrap()
                .payload,
            json!({"name":"draft"})
        );
        assert!(sessions.request("request-1", "main").is_err());
        assert!(sessions.complete("request-1", "main").is_err());
        assert_eq!(
            sessions
                .complete("request-1", "dialog-window-1")
                .unwrap()
                .dialog_id,
            "workspace.rename"
        );
        assert!(sessions.complete("request-1", "dialog-window-1").is_err());
    }

    #[test]
    fn owner_and_window_cleanup_remove_only_their_sessions() {
        let mut sessions = DialogSessions::default();
        sessions.insert(session()).unwrap();
        let mut other = session();
        other.request_id = "request-2".into();
        other.window_label = "dialog-window-2".into();
        other.owner_label = "workspace-window-a".into();
        sessions.insert(other).unwrap();

        assert_eq!(sessions.remove_owner("main").len(), 1);
        assert!(sessions.request("request-1", "dialog-window-1").is_err());
        assert!(sessions.remove_window("dialog-window-2").is_some());
        assert!(sessions.complete("request-2", "dialog-window-2").is_err());
    }

    #[test]
    fn owner_dialog_lookup_does_not_cross_owner_or_dialog_type() {
        let mut sessions = DialogSessions::default();
        sessions.insert(session()).unwrap();

        assert_eq!(
            sessions
                .find_owner_dialog("main", "workspace.rename")
                .unwrap()
                .request_id,
            "request-1"
        );
        assert!(sessions.find_owner_dialog("other", "workspace.rename").is_none());
        assert!(sessions.find_owner_dialog("main", "settings").is_none());
    }
}

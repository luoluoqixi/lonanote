use serde_json::Value;
use std::collections::HashMap;
use std::sync::LazyLock;

static DIALOG_ENTRIES: LazyLock<Value> = LazyLock::new(|| {
    serde_json::from_str(include_str!(
        "../../../src/api/common/dialogs/dialog_entry_manifest.json"
    ))
    .expect("Dialog 入口清单无效")
});

pub(crate) fn dialog_entry_path(dialog_id: &str) -> Option<String> {
    DIALOG_ENTRIES.get(dialog_id)?;
    Some(format!(
        "_dialog/{}.html",
        dialog_id.replace(['.', '-'], "_")
    ))
}

#[derive(Debug, Clone)]
pub(crate) struct DialogWindowSession {
    pub request_id: String,
    pub dialog_id: String,
    pub owner_label: String,
    pub parent_label: String,
    pub window_label: String,
    pub payload: Value,
    pub title: String,
    pub block_parent_input: bool,
    pub input_lock_token: Option<String>,
}

#[derive(Default)]
pub(crate) struct DialogSessions {
    requests: HashMap<String, DialogWindowSession>,
    windows: HashMap<String, String>,
    startup: HashMap<String, DialogStartup>,
}

#[derive(Default)]
struct DialogStartup {
    built: bool,
    ready: bool,
    presented: bool,
}

impl DialogStartup {
    fn take_presentation(&mut self) -> bool {
        if self.built && self.ready && !self.presented {
            self.presented = true;
            return true;
        }
        false
    }
}

pub(crate) enum DialogRegistration {
    Created(Vec<DialogWindowSession>),
    Existing(DialogWindowSession),
}

impl DialogSessions {
    pub(crate) fn mark_ready(&mut self, request_id: &str, caller: &str) -> Result<bool, String> {
        self.request(request_id, caller)?;
        let startup = self
            .startup
            .get_mut(request_id)
            .ok_or("Dialog 启动状态不存在")?;
        startup.ready = true;
        Ok(startup.take_presentation())
    }

    pub(crate) fn mark_built(&mut self, request_id: &str) -> Result<bool, String> {
        let startup = self
            .startup
            .get_mut(request_id)
            .ok_or("Dialog 请求已结束")?;
        startup.built = true;
        Ok(startup.take_presentation())
    }

    pub(crate) fn expire_pending(&mut self, request_id: &str) -> Option<DialogWindowSession> {
        if self.startup.get(request_id)?.presented {
            return None;
        }
        self.remove_request(request_id)
    }
    pub(crate) fn register(
        &mut self,
        session: DialogWindowSession,
    ) -> Result<DialogRegistration, String> {
        if session.dialog_id != "settings" {
            self.insert(session)?;
            return Ok(DialogRegistration::Created(Vec::new()));
        }
        if let Some(existing) = self.requests.get(&session.request_id) {
            if existing.owner_label == session.owner_label
                && existing.dialog_id == session.dialog_id
            {
                return Ok(DialogRegistration::Existing(existing.clone()));
            }
            return Err("Dialog 请求标识重复".into());
        }
        if self.windows.contains_key(&session.window_label) {
            return Err("Dialog 窗口标识重复".into());
        }
        // 在同一注册表锁内替换旧设置请求，旧 Abort 只能撤销旧 requestId。
        let mut removed = Vec::new();
        while let Some(existing) = self.find_owner_dialog(&session.owner_label, "settings") {
            self.remove_request(&existing.request_id);
            removed.extend(self.remove_owner(&existing.window_label));
            removed.push(existing);
        }
        self.insert(session)?;
        Ok(DialogRegistration::Created(removed))
    }

    pub(crate) fn find_owner_dialog(
        &self,
        owner_label: &str,
        dialog_id: &str,
    ) -> Option<DialogWindowSession> {
        self.requests
            .values()
            .find(|session| session.owner_label == owner_label && session.dialog_id == dialog_id)
            .cloned()
    }

    pub(crate) fn owner_for_window(&self, window_label: &str) -> Option<String> {
        let mut current = window_label;
        for _ in 0..=self.windows.len() {
            let Some(request_id) = self.windows.get(current) else {
                return (current != window_label).then(|| current.to_owned());
            };
            current = &self.requests.get(request_id)?.owner_label;
        }
        None
    }

    pub(crate) fn owned_request(
        &self,
        request_id: &str,
        caller: &str,
    ) -> Result<DialogWindowSession, String> {
        let session = self.requests.get(request_id).ok_or("Dialog 请求不存在")?;
        if session.owner_label != caller {
            return Err("当前窗口无权操作此 Dialog 请求".into());
        }
        Ok(session.clone())
    }

    pub(crate) fn insert(&mut self, session: DialogWindowSession) -> Result<(), String> {
        if self.requests.contains_key(&session.request_id)
            || self.windows.contains_key(&session.window_label)
        {
            return Err("Dialog 请求标识重复".into());
        }
        self.windows
            .insert(session.window_label.clone(), session.request_id.clone());
        self.startup
            .insert(session.request_id.clone(), DialogStartup::default());
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
        let session = self.remove_request(request_id).expect("请求已确认存在");
        Ok(session)
    }

    pub(crate) fn remove_window(&mut self, window_label: &str) -> Option<DialogWindowSession> {
        let request_id = self.windows.remove(window_label)?;
        self.startup.remove(&request_id);
        self.requests.remove(&request_id)
    }

    pub(crate) fn remove_request(&mut self, request_id: &str) -> Option<DialogWindowSession> {
        let session = self.requests.remove(request_id)?;
        self.startup.remove(request_id);
        self.windows.remove(&session.window_label);
        Some(session)
    }

    pub(crate) fn remove_owner(&mut self, owner_label: &str) -> Vec<DialogWindowSession> {
        let request_ids: Vec<_> = self
            .requests
            .iter()
            .filter(|(_, session)| {
                session.owner_label == owner_label || session.parent_label == owner_label
            })
            .map(|(request_id, _)| request_id.clone())
            .collect();
        let mut removed = Vec::new();
        for request_id in request_ids {
            if let Some(session) = self.remove_request(&request_id) {
                removed.extend(self.remove_owner(&session.window_label));
                removed.push(session);
            }
        }
        removed
    }

    pub(crate) fn remove_all(&mut self) -> Vec<DialogWindowSession> {
        let owners: Vec<_> = self
            .requests
            .values()
            .map(|session| session.owner_label.clone())
            .collect();
        let mut removed = Vec::new();
        for owner in owners {
            removed.extend(self.remove_owner(&owner));
        }
        removed
    }
}

#[cfg(test)]
mod tests {
    use super::{DialogRegistration, DialogSessions, DialogWindowSession};
    use serde_json::json;

    #[test]
    fn dialog_entries_are_selected_from_the_shared_allowlist() {
        assert_eq!(
            super::dialog_entry_path("settings").as_deref(),
            Some("_dialog/settings.html")
        );
        assert_eq!(
            super::dialog_entry_path("workspace.entry.rename").as_deref(),
            Some("_dialog/workspace_entry_rename.html")
        );
        assert!(super::dialog_entry_path("../../index").is_none());
        assert!(super::dialog_entry_path("unknown").is_none());
    }

    #[test]
    fn ready_requires_both_native_setup_and_content_and_only_reveals_once() {
        let mut sessions = DialogSessions::default();
        sessions.insert(session()).unwrap();
        assert!(sessions.mark_ready("request-1", "main").is_err());
        assert!(!sessions.mark_ready("request-1", "dialog-window-1").unwrap());
        assert!(sessions.mark_built("request-1").unwrap());
        assert!(!sessions.mark_ready("request-1", "dialog-window-1").unwrap());
        assert!(sessions.expire_pending("request-1").is_none());
    }

    #[test]
    fn pending_timeout_removes_only_hidden_sessions_and_ready_after_cancel_fails() {
        let mut sessions = DialogSessions::default();
        sessions.insert(session()).unwrap();
        assert!(!sessions.mark_built("request-1").unwrap());
        assert!(sessions.expire_pending("request-1").is_some());
        assert!(sessions.mark_ready("request-1", "dialog-window-1").is_err());
        assert!(sessions.remove_all().is_empty());
    }

    fn session() -> DialogWindowSession {
        DialogWindowSession {
            request_id: "request-1".into(),
            dialog_id: "workspace.rename".into(),
            owner_label: "main".into(),
            parent_label: "main".into(),
            window_label: "dialog-window-1".into(),
            payload: json!({ "name": "draft" }),
            title: "重命名".into(),
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
        other.parent_label = other.owner_label.clone();
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
        assert!(sessions
            .find_owner_dialog("other", "workspace.rename")
            .is_none());
        assert!(sessions.find_owner_dialog("main", "settings").is_none());
    }

    #[test]
    fn dialog_window_resolves_only_its_registered_owner() {
        let mut sessions = DialogSessions::default();
        sessions.insert(session()).unwrap();

        assert_eq!(
            sessions.owner_for_window("dialog-window-1").as_deref(),
            Some("main")
        );
        assert_eq!(sessions.owner_for_window("main"), None);
        assert_eq!(sessions.owner_for_window("unknown-dialog"), None);
    }

    #[test]
    fn nested_dialog_resolves_to_its_workbench_and_cleanup_includes_descendants() {
        let mut sessions = DialogSessions::default();
        sessions.insert(session()).unwrap();
        let mut nested = session();
        nested.request_id = "nested-request".into();
        nested.window_label = "nested-dialog".into();
        nested.owner_label = "dialog-window-1".into();
        nested.parent_label = nested.owner_label.clone();
        sessions.insert(nested).unwrap();
        assert_eq!(
            sessions.owner_for_window("nested-dialog").as_deref(),
            Some("main")
        );
        assert_eq!(sessions.remove_owner("main").len(), 2);
        assert!(sessions.request("nested-request", "nested-dialog").is_err());
    }

    #[test]
    fn only_the_request_owner_can_publish_or_dismiss_a_dialog() {
        let mut sessions = DialogSessions::default();
        sessions.insert(session()).unwrap();
        assert!(sessions
            .owned_request("request-1", "other-workbench")
            .is_err());
        assert!(sessions
            .owned_request("request-1", "dialog-window-1")
            .is_err());
        assert!(sessions.owned_request("request-1", "main").is_ok());
        sessions.remove_all();
        assert!(sessions.owned_request("request-1", "main").is_err());
    }

    #[test]
    fn closing_a_presenting_parent_also_cancels_workbench_owned_forms() {
        let mut sessions = DialogSessions::default();
        sessions.insert(session()).unwrap();
        let mut form = session();
        form.request_id = "form-request".into();
        form.window_label = "form-dialog".into();
        form.parent_label = "dialog-window-1".into();
        sessions.insert(form).unwrap();
        let removed = sessions.remove_owner("dialog-window-1");
        assert_eq!(removed.len(), 1);
        assert_eq!(removed[0].window_label, "form-dialog");
        assert!(sessions.owned_request("request-1", "main").is_ok());
        assert_eq!(sessions.remove_all().len(), 1);
        assert!(sessions.remove_all().is_empty());
    }

    #[test]
    fn reopening_settings_replaces_the_old_request_and_its_presented_forms() {
        let mut sessions = DialogSessions::default();
        let mut old = session();
        old.dialog_id = "settings".into();
        sessions.register(old.clone()).unwrap();
        let mut form = session();
        form.request_id = "form-request".into();
        form.window_label = "form-dialog".into();
        form.parent_label = old.window_label.clone();
        sessions.insert(form).unwrap();
        let mut other_owner = old.clone();
        other_owner.request_id = "other-request".into();
        other_owner.window_label = "other-dialog".into();
        other_owner.owner_label = "other-workbench".into();
        other_owner.parent_label = other_owner.owner_label.clone();
        sessions.register(other_owner).unwrap();
        let mut new = old.clone();
        new.request_id = "new-request".into();
        new.window_label = "new-dialog".into();

        let DialogRegistration::Created(removed) = sessions.register(new).unwrap() else {
            panic!("新请求不能复用旧 requestId");
        };
        assert_eq!(removed.len(), 2);
        assert!(removed.iter().any(|item| item.request_id == old.request_id));
        assert!(removed.iter().any(|item| item.request_id == "form-request"));
        assert!(sessions.remove_request(&old.request_id).is_none());
        assert!(sessions.owned_request("new-request", "main").is_ok());
        assert!(sessions
            .owned_request("other-request", "other-workbench")
            .is_ok());
    }

    #[test]
    fn repeated_settings_request_is_idempotent_even_before_the_window_is_built() {
        let mut sessions = DialogSessions::default();
        let mut original = session();
        original.dialog_id = "settings".into();
        sessions.register(original.clone()).unwrap();
        let mut retry = original.clone();
        retry.window_label = "unused-retry-window".into();

        let DialogRegistration::Existing(existing) = sessions.register(retry).unwrap() else {
            panic!("相同 requestId 必须保留正在创建的原会话");
        };
        assert_eq!(existing.window_label, original.window_label);
        assert_eq!(sessions.remove_all().len(), 1);
    }
}

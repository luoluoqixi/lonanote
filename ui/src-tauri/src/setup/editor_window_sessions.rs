use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorWindowBootstrap {
    pub window_label: String,
    pub role: String,
    pub session_id: String,
    pub owner_window_label: String,
    pub owner_epoch: u64,
    pub checkpoint: Option<Value>,
    pub initial_payload: Option<Value>,
    pub owner_destroyed: bool,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorWindowMessage {
    pub from_window_label: String,
    pub to_window_label: String,
    pub session_id: String,
    pub owner_epoch: u64,
    pub request_id: String,
    pub payload: Value,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorWindowLifecycle {
    pub window_label: String,
    pub owner_window_label: String,
    pub session_id: String,
    pub owner_epoch: u64,
    pub request_id: Option<String>,
}
struct Session {
    id: String,
    epoch: u64,
    checkpoint: Option<Value>,
    members: HashMap<String, Value>,
    transfers: HashMap<String, String>,
    shown: HashSet<String>,
    discarding: HashSet<String>,
    tab_drags: HashMap<String, (String, String, std::time::Instant)>,
}
#[derive(Default)]
pub struct EditorWindowSessions {
    sessions: HashMap<String, Session>,
    orphans: HashMap<String, EditorWindowBootstrap>,
}
impl EditorWindowSessions {
    pub fn register_owner(&mut self, label: &str) {
        self.sessions
            .entry(label.to_owned())
            .or_insert_with(|| Session {
                id: uuid::Uuid::new_v4().to_string(),
                epoch: 0,
                checkpoint: None,
                members: HashMap::new(),
                transfers: HashMap::new(),
                shown: HashSet::new(),
                discarding: HashSet::new(),
                tab_drags: HashMap::new(),
            });
    }
    pub fn owner_of(&self, label: &str) -> Option<&str> {
        if let Some(orphan) = self.orphans.get(label) {
            return Some(&orphan.owner_window_label);
        }
        self.sessions
            .get_key_value(label)
            .map(|(key, _)| key.as_str())
            .or_else(|| {
                self.sessions
                    .iter()
                    .find(|(_, session)| session.members.contains_key(label))
                    .map(|(owner, _)| owner.as_str())
            })
    }
    pub fn is_editor(&self, label: &str) -> bool {
        self.owner_of(label).is_some_and(|owner| owner != label)
    }
    pub fn member_lifecycle(
        &self,
        label: &str,
        request_id: Option<&str>,
    ) -> Option<EditorWindowLifecycle> {
        if self.orphans.contains_key(label) {
            return None;
        }
        let owner = self.owner_of(label)?;
        if owner == label {
            return None;
        }
        let session = self.sessions.get(owner)?;
        Some(EditorWindowLifecycle {
            window_label: label.into(),
            owner_window_label: owner.into(),
            session_id: session.id.clone(),
            owner_epoch: session.epoch,
            request_id: request_id.map(str::to_owned),
        })
    }
    pub fn authorize_claim_epoch(&self, label: &str, epoch: Option<u64>) -> Result<(), String> {
        if self.is_editor(label) || label.starts_with("editor-window-") {
            return Err("辅助编辑器不能持有文件占用".into());
        }
        if let Some(session) = self.sessions.get(label) {
            if session.epoch > 0 && epoch != Some(session.epoch) {
                return Err("文件占用请求的编辑器会话代次已失效".into());
            }
        }
        Ok(())
    }
    pub fn preserve_owner_claims(&self, label: &str) -> bool {
        self.sessions
            .get(label)
            .is_some_and(|session| session.checkpoint.is_some())
    }
    pub fn authorize_dialog_parent(&self, caller: &str, target: &str) -> Result<(), String> {
        if caller == target {
            return Ok(());
        }
        if self.orphans.contains_key(target)
            || self.is_editor(caller)
            || self.owner_of(target) != Some(caller)
            || !self.is_editor(target)
        {
            return Err("只能为本工作台的辅助编辑器指定对话框所属窗口".into());
        }
        Ok(())
    }
    pub fn authorize_core_command(&self, label: &str, key: &str) -> Result<(), String> {
        if !self.is_editor(label) && !label.starts_with("editor-window-") {
            return Ok(());
        }
        if self.owner_of(label).is_none() {
            return Err("辅助编辑器会话已结束".into());
        }
        if matches!(
            key,
            // 启动公共配置需要读取版本号；不开放其他 app 命令。
            "app.get_version"
                | "settings.get_settings"
                | "settings.snapshot"
                | "store.common_get"
                | "store.common_has"
                | "store.common_keys"
                | "store.common_values"
                | "store.common_len"
                | "store.common_is_empty"
                | "store.common_all"
                | "store.common_snapshot"
                | "path.get_cache_dir"
                | "path.get_data_dir"
                | "path.get_home_dir"
                | "path.get_download_dir"
        ) {
            return Ok(());
        }
        Err("辅助编辑器只可读取界面设置，文档操作必须通过原工作台".into())
    }
    pub fn epoch(&self, label: &str) -> Option<u64> {
        if let Some(orphan) = self.orphans.get(label) {
            return Some(orphan.owner_epoch);
        }
        self.sessions.get(self.owner_of(label)?).map(|s| s.epoch)
    }
    /// 拖放只读取当前会话身份，不得调用 bootstrap 推进 owner 代次。
    pub fn drag_session(&self, label: &str) -> Result<(String, String, u64), String> {
        if self.orphans.contains_key(label) {
            return Err("原工作台已关闭".into());
        }
        let owner = self.owner_of(label).ok_or("窗口会话已结束")?;
        let session = self.sessions.get(owner).ok_or("窗口会话已结束")?;
        Ok((owner.into(), session.id.clone(), session.epoch))
    }
    fn projection(&self, label: &str) -> Result<EditorWindowBootstrap, String> {
        if let Some(orphan) = self.orphans.get(label) {
            return Ok(orphan.clone());
        }
        let owner = self.owner_of(label).ok_or("未知的编辑器窗口会话")?;
        let session = &self.sessions[owner];
        Ok(EditorWindowBootstrap {
            window_label: label.into(),
            role: if owner == label {
                "workbench"
            } else {
                "editor"
            }
            .into(),
            session_id: session.id.clone(),
            owner_window_label: owner.into(),
            owner_epoch: session.epoch,
            checkpoint: session.checkpoint.clone(),
            initial_payload: session.members.get(label).cloned(),
            owner_destroyed: false,
        })
    }
    pub fn bootstrap(&mut self, label: &str) -> Result<EditorWindowBootstrap, String> {
        if let Some(session) = self.sessions.get_mut(label) {
            session.tab_drags.clear();
            session.epoch = session.epoch.checked_add(1).ok_or("编辑器会话代次已耗尽")?;
        }
        self.projection(label)
    }
    pub fn begin_tab_drag(
        &mut self,
        caller: &str,
        token: String,
        editor_id: String,
    ) -> Result<(), String> {
        if token.len() > 128 || token.is_empty() || editor_id.len() > 256 || editor_id.is_empty() {
            return Err("无效标签拖动".into());
        }
        if self.orphans.contains_key(caller) {
            return Err("原工作台已关闭".into());
        }
        let owner = self.owner_of(caller).ok_or("未知窗口")?.to_owned();
        let session = self.sessions.get_mut(&owner).ok_or("会话已关闭")?;
        session
            .tab_drags
            .retain(|_, (source, _, created)| source != caller && created.elapsed().as_secs() < 60);
        if session.tab_drags.len() >= 64 || session.tab_drags.contains_key(&token) {
            return Err("无效拖动凭据".into());
        }
        session
            .tab_drags
            .insert(token, (caller.into(), editor_id, std::time::Instant::now()));
        Ok(())
    }
    pub fn take_tab_drag(
        &mut self,
        caller: &str,
        target: &str,
        token: &str,
    ) -> Result<(String, String), String> {
        // 仅 owner 可交接；同一会话内 sibling 的拖放仍经 owner 协调。
        if self.owner_of(caller) != Some(caller) {
            return Err("仅原工作台可交接标签".into());
        }
        self.authorize_target(caller, target)?;
        let (source, editor, created) = self
            .sessions
            .get_mut(caller)
            .ok_or("未知工作台")?
            .tab_drags
            .remove(token)
            .ok_or("拖动凭据已失效")?;
        if created.elapsed().as_secs() >= 60 || self.owner_of(&source) != Some(caller) {
            return Err("拖动来源已失效".into());
        }
        Ok((source, editor))
    }
    pub fn create(
        &mut self,
        owner: &str,
        transfer: &str,
        label: &str,
        payload: Value,
    ) -> Result<EditorWindowBootstrap, String> {
        if transfer.is_empty() {
            return Err("缺少 transferId".into());
        }
        let session = self
            .sessions
            .get_mut(owner)
            .ok_or("只有工作台可创建辅助编辑器窗口")?;
        if session.epoch == 0 {
            return Err("工作台编辑器会话尚未初始化".into());
        }
        if let Some(existing) = session.transfers.get(transfer).cloned() {
            return self.projection(&existing);
        }
        session.members.insert(label.into(), payload);
        session.transfers.insert(transfer.into(), label.into());
        self.projection(label)
    }
    pub fn mark_shown(&mut self, label: &str) -> Result<(), String> {
        let owner = self.owner_of(label).ok_or("未知辅助窗口")?.to_owned();
        if owner == label {
            return Err("目标不是辅助窗口".into());
        }
        let session = self.sessions.get_mut(&owner).unwrap();
        if session.discarding.contains(label) {
            return Err("辅助窗口转移已撤销".into());
        }
        session.shown.insert(label.into());
        Ok(())
    }
    pub fn rollback_show(&mut self, label: &str) {
        if let Some(owner) = self.owner_of(label).map(str::to_owned) {
            self.sessions.get_mut(&owner).unwrap().shown.remove(label);
        }
    }
    pub fn reserve_discard(
        &mut self,
        caller: &str,
        target: &str,
        transfer: &str,
    ) -> Result<(), String> {
        self.authorize_discard(caller, target, transfer)?;
        self.sessions
            .get_mut(caller)
            .unwrap()
            .discarding
            .insert(target.into());
        Ok(())
    }
    pub fn authorize_discard(
        &self,
        caller: &str,
        target: &str,
        transfer: &str,
    ) -> Result<(), String> {
        let session = self.sessions.get(caller).ok_or("只有owner能撤销窗口转移")?;
        if session.transfers.get(transfer).map(String::as_str) != Some(target)
            || session.shown.contains(target)
        {
            return Err("只能撤销本次转移尚未显示的辅助窗口".into());
        }
        Ok(())
    }
    pub fn authorize_target(&self, caller: &str, target: &str) -> Result<(), String> {
        if self.orphans.contains_key(caller) || self.orphans.contains_key(target) {
            return Err("原工作台已销毁，辅助编辑器仅可恢复草稿".into());
        }
        let owner = self.owner_of(caller).ok_or("未知的编辑器窗口会话")?;
        let target_owner = self.owner_of(target).ok_or("目标编辑器窗口已关闭")?;
        if target_owner != owner || (caller != owner && target != owner) {
            return Err("不允许跨会话或辅助窗口之间直接通信".into());
        }
        Ok(())
    }
    pub fn message(
        &self,
        from: &str,
        to: &str,
        request: &str,
        payload: Value,
        epoch: u64,
    ) -> Result<EditorWindowMessage, String> {
        self.authorize_target(from, to)?;
        let bootstrap = self.projection(from)?;
        if epoch != bootstrap.owner_epoch {
            return Err("编辑器会话代次已失效".into());
        }
        if request.is_empty() {
            return Err("缺少 requestId".into());
        }
        Ok(EditorWindowMessage {
            from_window_label: from.into(),
            to_window_label: to.into(),
            session_id: bootstrap.session_id,
            owner_epoch: epoch,
            request_id: request.into(),
            payload,
        })
    }
    pub fn store_checkpoint(
        &mut self,
        caller: &str,
        epoch: u64,
        checkpoint: Value,
    ) -> Result<(), String> {
        let session = self
            .sessions
            .get_mut(caller)
            .ok_or("只有原工作台可保存恢复记录")?;
        if session.epoch != epoch {
            return Err("编辑器会话代次已失效".into());
        }
        session.checkpoint = Some(checkpoint);
        Ok(())
    }
    pub fn close_members(&self, label: &str) -> Vec<String> {
        let mut members = self
            .sessions
            .get(label)
            .map(|s| s.members.keys().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        members.sort();
        members.push(label.into());
        members
    }
    pub fn hidden_members(&self, owner: &str) -> Vec<String> {
        self.sessions
            .get(owner)
            .map(|session| {
                session
                    .members
                    .keys()
                    .filter(|label| !session.shown.contains(*label))
                    .cloned()
                    .collect()
            })
            .unwrap_or_default()
    }
    pub fn orphan_owner_if_epoch(&mut self, owner: &str, epoch: u64) -> Vec<EditorWindowLifecycle> {
        if self.epoch(owner) != Some(epoch) || !self.sessions.contains_key(owner) {
            return vec![];
        }
        let labels = self.close_members(owner);
        let mut notices = vec![];
        for label in labels.iter().filter(|label| label.as_str() != owner) {
            if !self.sessions[owner].shown.contains(label) {
                continue;
            }
            if let Some(notice) = self.member_lifecycle(label, None) {
                let mut projection = self.projection(label).unwrap();
                projection.owner_destroyed = true;
                self.orphans.insert(label.clone(), projection);
                notices.push(notice);
            }
        }
        self.sessions.remove(owner);
        notices
    }
    pub fn remove_if_epoch(&mut self, label: &str, epoch: u64) -> Vec<String> {
        if self.epoch(label) != Some(epoch) {
            return vec![];
        }
        if self.orphans.remove(label).is_some() {
            return vec![label.into()];
        }
        let members = self.close_members(label);
        if self.sessions.remove(label).is_none() {
            if let Some(owner) = self.owner_of(label).map(str::to_owned) {
                let session = self.sessions.get_mut(&owner).unwrap();
                session.members.remove(label);
                session.shown.remove(label);
                session.discarding.remove(label);
                session.transfers.retain(|_, member| member != label);
            }
        }
        members
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn reading_drag_identity_does_not_reload_the_owner() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("main");
        let boot = state.bootstrap("main").unwrap();
        state
            .create("main", "transfer", "editor-window-child", json!({}))
            .unwrap();
        for label in ["main", "editor-window-child", "main"] {
            assert_eq!(
                state.drag_session(label).unwrap(),
                ("main".into(), boot.session_id.clone(), boot.owner_epoch)
            );
            assert_eq!(state.epoch("main"), Some(boot.owner_epoch));
        }
    }
    #[test]
    fn tab_drag_is_authenticated_one_shot_and_limited_to_the_owners_session() {
        let mut state = EditorWindowSessions::default();
        for owner in ["main", "other"] {
            state.register_owner(owner);
            state.bootstrap(owner).unwrap();
        }
        for (token, label) in [("one", "editor-window-a"), ("two", "editor-window-b")] {
            state.create("main", token, label, json!({})).unwrap();
        }
        state
            .begin_tab_drag("editor-window-a", "drag".into(), "editor".into())
            .unwrap();
        assert!(state.take_tab_drag("other", "other", "drag").is_err());
        assert!(state
            .take_tab_drag("editor-window-b", "main", "drag")
            .is_err());
        assert!(state.take_tab_drag("main", "other", "drag").is_err());
        assert_eq!(
            state
                .take_tab_drag("main", "editor-window-b", "drag")
                .unwrap(),
            ("editor-window-a".into(), "editor".into())
        );
        assert!(state
            .take_tab_drag("main", "editor-window-b", "drag")
            .is_err());
        state
            .begin_tab_drag("editor-window-a", "old".into(), "editor".into())
            .unwrap();
        let epoch = state.epoch("main").unwrap();
        state.remove_if_epoch("editor-window-a", epoch);
        assert!(state.take_tab_drag("main", "main", "old").is_err());
    }
    #[test]
    fn auxiliary_startup_can_read_version_without_granting_app_or_document_operations() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("main");
        state.bootstrap("main").unwrap();
        state
            .create("main", "startup", "editor-window-startup", json!({}))
            .unwrap();
        assert!(state
            .authorize_core_command("editor-window-startup", "app.get_version")
            .is_ok());
        for command in [
            "app.init",
            "app.exit",
            "workspace.open",
            "fs.read_text",
            "fs.write",
            "store.common_patch_and_save",
        ] {
            assert!(
                state
                    .authorize_core_command("editor-window-startup", command)
                    .is_err(),
                "{command}"
            );
        }
    }
    #[test]
    fn owner_projection_and_auxiliary_reply_share_authenticated_session() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("main");
        let owner = state.bootstrap("main").unwrap();
        state
            .create("main", "transfer", "editor-window-child", json!({}))
            .unwrap();
        let child = state.bootstrap("editor-window-child").unwrap();
        for (from, to, payload) in [
            (
                "main",
                "editor-window-child",
                json!({"kind":"request", "method":"projection"}),
            ),
            (
                "editor-window-child",
                "main",
                json!({"kind":"response", "ok":true}),
            ),
        ] {
            let message = state
                .message(from, to, "request:1", payload, owner.owner_epoch)
                .unwrap();
            assert_eq!(message.from_window_label, from);
            assert_eq!(message.to_window_label, to);
            assert_eq!(message.session_id, owner.session_id);
            assert_eq!(message.session_id, child.session_id);
            assert_eq!(message.owner_epoch, child.owner_epoch);
        }
        state.remove_if_epoch("editor-window-child", owner.owner_epoch);
        assert!(state
            .message(
                "main",
                "editor-window-child",
                "request:2",
                json!({}),
                owner.owner_epoch
            )
            .is_err());
    }
    #[test]
    fn identities_epochs_and_recovery_are_owned_by_the_session() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("main");
        state.register_owner("other");
        let owner = state.bootstrap("main").unwrap();
        let child = state
            .create(
                "main",
                "transfer",
                "editor-window-one",
                json!({"draft": "a"}),
            )
            .unwrap();
        assert_eq!(child.owner_epoch, owner.owner_epoch);
        assert!(state
            .message(
                "editor-window-one",
                "other",
                "req",
                json!({}),
                owner.owner_epoch
            )
            .is_err());
        assert!(state
            .store_checkpoint("editor-window-one", owner.owner_epoch, json!({}))
            .is_err());
        state
            .store_checkpoint("main", owner.owner_epoch, json!({"revision": 3}))
            .unwrap();
        let restored = state.bootstrap("main").unwrap();
        assert!(restored.owner_epoch > owner.owner_epoch);
        assert_eq!(restored.checkpoint, Some(json!({"revision": 3})));
        assert!(state
            .store_checkpoint("main", owner.owner_epoch, json!({"revision": 1}))
            .is_err());
        assert_eq!(
            state.bootstrap("editor-window-one").unwrap().checkpoint,
            restored.checkpoint
        );
        assert_eq!(child.initial_payload, Some(json!({"draft": "a"})));
        assert!(state
            .message(
                "editor-window-one",
                "main",
                "stale",
                json!({}),
                owner.owner_epoch
            )
            .is_err());
        assert_eq!(
            state.bootstrap("editor-window-one").unwrap().owner_epoch,
            restored.owner_epoch
        );
        assert_eq!(
            state.close_members("main"),
            vec!["editor-window-one".to_string(), "main".to_string()]
        );
        assert_eq!(
            state.close_members("editor-window-one"),
            vec!["editor-window-one".to_string()]
        );
        assert!(state.remove_if_epoch("main", owner.owner_epoch).is_empty());
        assert_eq!(state.remove_if_epoch("main", restored.owner_epoch).len(), 2);
        assert!(!state.is_editor("editor-window-one"));
    }
    #[test]
    fn closed_target_is_distinct_from_live_foreign_session() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("main");
        state.register_owner("other");
        let owner = state.bootstrap("main").unwrap();
        state
            .create("main", "t", "editor-window-one", json!({}))
            .unwrap();
        assert!(state.authorize_target("main", "editor-window-one").is_ok());
        assert_eq!(
            state.authorize_target("main", "other").unwrap_err(),
            "不允许跨会话或辅助窗口之间直接通信"
        );
        state.remove_if_epoch("editor-window-one", owner.owner_epoch);
        assert_eq!(
            state
                .authorize_target("main", "editor-window-one")
                .unwrap_err(),
            "目标编辑器窗口已关闭"
        );
    }

    #[test]
    fn transfers_are_idempotent_and_messages_only_route_through_owner() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("main");
        let owner = state.bootstrap("main").unwrap();
        let first = state
            .create("main", "t", "editor-window-one", json!({}))
            .unwrap();
        assert_eq!(
            state
                .create("main", "t", "unused", json!({}))
                .unwrap()
                .window_label,
            first.window_label
        );
        state
            .create("main", "t2", "editor-window-two", json!({}))
            .unwrap();
        assert!(state
            .message(
                "editor-window-one",
                "editor-window-two",
                "r",
                json!({}),
                owner.owner_epoch
            )
            .is_err());
        let message = state
            .message(
                "editor-window-one",
                "main",
                "r",
                json!({"kind":"save"}),
                owner.owner_epoch,
            )
            .unwrap();
        assert_eq!(message.from_window_label, "editor-window-one");
        assert_eq!(message.session_id, owner.session_id);
        state.remove_if_epoch("editor-window-one", owner.owner_epoch);
        assert!(state
            .message(
                "editor-window-one",
                "main",
                "r",
                json!({}),
                owner.owner_epoch
            )
            .is_err());
    }
    #[test]
    fn auxiliary_core_access_and_dialog_parent_are_explicit() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("main");
        state.register_owner("other");
        let owner = state.bootstrap("main").unwrap();
        state.bootstrap("other").unwrap();
        state
            .create("main", "t", "editor-window-a", json!({}))
            .unwrap();
        for command in [
            "workspace.open",
            "workspace.resource.acquire_scope",
            "fs.read_text",
            "settings.set_settings",
            "store.common_patch_and_save",
            "app.init",
        ] {
            assert!(
                state
                    .authorize_core_command("editor-window-a", command)
                    .is_err(),
                "{command}"
            );
            assert!(state.authorize_core_command("main", command).is_ok());
        }
        for command in [
            "settings.snapshot",
            "settings.get_settings",
            "store.common_snapshot",
            "store.common_all",
        ] {
            assert!(state
                .authorize_core_command("editor-window-a", command)
                .is_ok());
        }
        assert!(state
            .authorize_dialog_parent("main", "editor-window-a")
            .is_ok());
        assert!(state
            .authorize_dialog_parent("other", "editor-window-a")
            .is_err());
        assert!(state
            .authorize_dialog_parent("editor-window-a", "main")
            .is_err());
        assert!(!state.preserve_owner_claims("main"));
        state
            .store_checkpoint("main", owner.owner_epoch, json!({"documents":[]}))
            .unwrap();
        assert!(state.preserve_owner_claims("main"));
        state.bootstrap("main").unwrap();
        assert!(state.preserve_owner_claims("main"));
        assert!(!state.preserve_owner_claims("editor-window-a"));
        assert!(state
            .create("editor-window-a", "forged", "editor-window-b", json!({}))
            .is_err());
        let epoch = state.epoch("main").unwrap();
        state.remove_if_epoch("main", epoch);
        assert!(state.bootstrap("editor-window-a").is_err());
        assert!(state
            .authorize_dialog_parent("other", "editor-window-a")
            .is_err());
    }
    #[test]
    fn claim_epochs_reject_late_renderer_claim_and_cleanup() {
        let mut state = EditorWindowSessions::default();
        assert!(state.authorize_claim_epoch("legacy", None).is_ok());
        state.register_owner("main");
        assert!(state.authorize_claim_epoch("main", None).is_ok());
        let first = state.bootstrap("main").unwrap();
        assert!(state.authorize_claim_epoch("main", None).is_err());
        assert!(state
            .authorize_claim_epoch("main", Some(first.owner_epoch))
            .is_ok());
        state
            .create("main", "t", "editor-window-a", json!({}))
            .unwrap();
        assert!(state
            .authorize_claim_epoch("editor-window-a", Some(first.owner_epoch))
            .is_err());
        let next = state.bootstrap("main").unwrap();
        assert!(state
            .authorize_claim_epoch("main", Some(first.owner_epoch))
            .is_err());
        assert!(state
            .authorize_claim_epoch("main", Some(next.owner_epoch))
            .is_ok());
        state.remove_if_epoch("main", next.owner_epoch);
        assert!(state
            .authorize_claim_epoch("editor-window-a", None)
            .is_err());
    }
    #[test]
    fn lifecycle_targets_real_owner_and_retains_recovery_before_removal() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("owner");
        let owner = state.bootstrap("owner").unwrap();
        state
            .create("owner", "t", "editor-window-a", json!({"draft":"unsaved"}))
            .unwrap();
        state
            .store_checkpoint("owner", owner.owner_epoch, json!({"draft":"unsaved"}))
            .unwrap();
        let notice = state
            .member_lifecycle("editor-window-a", Some("close-round"))
            .unwrap();
        assert_eq!(notice.owner_window_label, "owner");
        assert_eq!(notice.session_id, owner.session_id);
        assert_eq!(notice.owner_epoch, owner.owner_epoch);
        assert_eq!(notice.request_id.as_deref(), Some("close-round"));
        assert!(state.member_lifecycle("owner", None).is_none());
        state.remove_if_epoch("editor-window-a", owner.owner_epoch);
        assert!(state.member_lifecycle("editor-window-a", None).is_none());
        assert_eq!(
            state.bootstrap("owner").unwrap().checkpoint,
            Some(json!({"draft":"unsaved"}))
        );
    }
    #[test]
    fn discard_only_accepts_owners_matching_hidden_transfer_and_blocks_late_show() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("owner");
        state.register_owner("other");
        state.bootstrap("owner").unwrap();
        state.bootstrap("other").unwrap();
        state
            .create("owner", "t", "editor-window-a", json!({}))
            .unwrap();
        assert!(state
            .authorize_discard("other", "editor-window-a", "t")
            .is_err());
        assert!(state
            .authorize_discard("editor-window-a", "editor-window-a", "t")
            .is_err());
        assert!(state
            .authorize_discard("owner", "editor-window-a", "wrong")
            .is_err());
        state.mark_shown("editor-window-a").unwrap();
        assert!(state
            .authorize_discard("owner", "editor-window-a", "t")
            .is_err());
        state.rollback_show("editor-window-a");
        state
            .reserve_discard("owner", "editor-window-a", "t")
            .unwrap();
        assert!(state.mark_shown("editor-window-a").is_err());
    }
    #[test]
    fn unexpected_owner_loss_keeps_auxiliary_recovery_until_its_own_confirmed_close() {
        let mut state = EditorWindowSessions::default();
        state.register_owner("owner");
        let owner = state.bootstrap("owner").unwrap();
        state
            .create("owner", "t", "editor-window-a", json!({"unacked":"draft"}))
            .unwrap();
        state
            .store_checkpoint("owner", owner.owner_epoch, json!({"acked":"draft"}))
            .unwrap();
        state.mark_shown("editor-window-a").unwrap();
        state
            .create("owner", "hidden", "editor-window-hidden", json!({}))
            .unwrap();
        assert_eq!(
            state.hidden_members("owner"),
            vec!["editor-window-hidden".to_string()]
        );
        assert!(state
            .orphan_owner_if_epoch("owner", owner.owner_epoch + 1)
            .is_empty());
        let notices = state.orphan_owner_if_epoch("owner", owner.owner_epoch);
        assert_eq!(notices.len(), 1);
        assert!(state.bootstrap("editor-window-hidden").is_err());
        assert_eq!(notices[0].window_label, "editor-window-a");
        assert!(state.bootstrap("owner").is_err());
        let orphan = state.bootstrap("editor-window-a").unwrap();
        assert!(orphan.owner_destroyed);
        assert_eq!(orphan.initial_payload, Some(json!({"unacked":"draft"})));
        assert_eq!(orphan.checkpoint, Some(json!({"acked":"draft"})));
        assert!(state.is_editor("editor-window-a"));
        assert!(state
            .message(
                "editor-window-a",
                "owner",
                "r",
                json!({}),
                owner.owner_epoch
            )
            .is_err());
        assert!(state
            .authorize_claim_epoch("editor-window-a", Some(owner.owner_epoch))
            .is_err());
        assert_eq!(
            state.close_members("editor-window-a"),
            vec!["editor-window-a".to_string()]
        );
        state.register_owner("owner");
        state.bootstrap("owner").unwrap();
        assert!(state.authorize_target("owner", "editor-window-a").is_err());
        assert!(state
            .remove_if_epoch("editor-window-a", owner.owner_epoch + 1)
            .is_empty());
        assert_eq!(
            state.remove_if_epoch("editor-window-a", owner.owner_epoch),
            vec!["editor-window-a".to_string()]
        );
        assert!(state.bootstrap("editor-window-a").is_err());
    }
}

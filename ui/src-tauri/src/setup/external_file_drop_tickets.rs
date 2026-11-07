use std::{
    collections::HashMap,
    path::PathBuf,
    time::{Duration, Instant},
};

pub struct DropTicket {
    pub source: String,
    pub owner: String,
    pub session_id: String,
    pub epoch: u64,
    pub paths: Vec<PathBuf>,
    pub created: Instant,
}

#[derive(Default)]
pub struct ExternalFileDrops(HashMap<String, DropTicket>);

impl ExternalFileDrops {
    pub fn insert(&mut self, token: String, ticket: DropTicket) {
        self.0
            .retain(|_, item| item.created.elapsed() < Duration::from_secs(60));
        if self.0.len() >= 128 {
            self.0.clear();
        }
        self.0.insert(token, ticket);
    }

    pub fn take(
        &mut self,
        token: &str,
        source: &str,
        owner: &str,
        session: &str,
        epoch: u64,
    ) -> Result<Vec<PathBuf>, String> {
        let item = self.0.get(token).ok_or("文件拖放已失效，请重新拖动")?;
        if item.created.elapsed() >= Duration::from_secs(60)
            || item.source != source
            || item.owner != owner
            || item.session_id != session
            || item.epoch != epoch
        {
            return Err("文件拖放不属于当前窗口会话".into());
        }
        Ok(self.0.remove(token).unwrap().paths)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn drop_ticket_is_session_bound_and_one_shot() {
        let mut tickets = ExternalFileDrops::default();
        tickets.insert(
            "token".into(),
            DropTicket {
                source: "child".into(),
                owner: "main".into(),
                session_id: "session".into(),
                epoch: 2,
                paths: vec![PathBuf::from("note.md")],
                created: Instant::now(),
            },
        );
        assert!(tickets
            .take("token", "other", "main", "session", 2)
            .is_err());
        assert!(tickets
            .take("token", "child", "main", "session", 3)
            .is_err());
        assert!(tickets.take("token", "child", "main", "other", 2).is_err());
        assert_eq!(
            tickets
                .take("token", "child", "main", "session", 2)
                .unwrap(),
            vec![PathBuf::from("note.md")]
        );
        assert!(tickets
            .take("token", "child", "main", "session", 2)
            .is_err());
    }
    #[test]
    fn old_drop_is_not_reused() {
        let mut tickets = ExternalFileDrops::default();
        tickets.insert(
            "old".into(),
            DropTicket {
                source: "main".into(),
                owner: "main".into(),
                session_id: "s".into(),
                epoch: 1,
                paths: vec![],
                created: Instant::now() - Duration::from_secs(61),
            },
        );
        assert!(tickets.take("old", "main", "main", "s", 1).is_err());
    }
}

use std::collections::{HashMap, HashSet};
use std::sync::{LazyLock, Mutex};

#[derive(Default)]
pub(crate) struct DialogInputLocks {
    parents: HashMap<String, ParentLocks>,
    tokens: HashMap<String, String>,
}

#[derive(Default)]
struct ParentLocks {
    tokens: HashSet<String>,
    restore_enabled: bool,
}

pub(crate) struct AcquiredInputLock {
    pub token: String,
    pub disable_window: bool,
}

impl DialogInputLocks {
    pub(crate) fn acquire(&mut self, parent: &str, was_enabled: bool) -> AcquiredInputLock {
        let token = uuid::Uuid::new_v4().to_string();
        let locks = self
            .parents
            .entry(parent.to_string())
            .or_insert_with(|| ParentLocks {
                tokens: HashSet::new(),
                restore_enabled: was_enabled,
            });
        let disable_window = locks.tokens.is_empty() && was_enabled;
        locks.tokens.insert(token.clone());
        self.tokens.insert(token.clone(), parent.to_string());
        AcquiredInputLock {
            token,
            disable_window,
        }
    }

    pub(crate) fn release(&mut self, parent: &str, token: &str) -> Option<bool> {
        if self.tokens.get(token).map(String::as_str) != Some(parent) {
            return None;
        }
        self.tokens.remove(token);
        let locks = self.parents.get_mut(parent)?;
        locks.tokens.remove(token);
        if !locks.tokens.is_empty() {
            return Some(false);
        }
        let restore_enabled = locks.restore_enabled;
        self.parents.remove(parent);
        Some(restore_enabled)
    }

    pub(crate) fn window_destroyed(&mut self, parent: &str) -> usize {
        let Some(locks) = self.parents.remove(parent) else {
            return 0;
        };
        for token in &locks.tokens {
            self.tokens.remove(token);
        }
        locks.tokens.len()
    }

    #[cfg(test)]
    fn contains_parent(&self, parent: &str) -> bool {
        self.parents.contains_key(parent)
    }
}

pub(crate) static DIALOG_INPUT_LOCKS: LazyLock<Mutex<DialogInputLocks>> =
    LazyLock::new(|| Mutex::new(DialogInputLocks::default()));

#[cfg(test)]
mod tests {
    use super::DialogInputLocks;

    #[test]
    fn nested_locks_restore_enabled_parent_after_last_release() {
        let mut locks = DialogInputLocks::default();
        let first = locks.acquire("main", true);
        let second = locks.acquire("main", true);

        assert!(first.disable_window);
        assert!(!second.disable_window);
        assert_eq!(locks.release("main", &first.token), Some(false));
        assert_eq!(locks.release("main", &second.token), Some(true));
    }

    #[test]
    fn disabled_parent_stays_disabled_and_release_is_idempotent() {
        let mut locks = DialogInputLocks::default();
        let lock = locks.acquire("main", false);

        assert!(!lock.disable_window);
        assert_eq!(locks.release("main", &lock.token), Some(false));
        assert_eq!(locks.release("main", &lock.token), None);
    }

    #[test]
    fn different_parents_are_released_independently() {
        let mut locks = DialogInputLocks::default();
        let main = locks.acquire("main", true);
        let workspace = locks.acquire("workspace-window-a", true);

        assert_eq!(locks.release("main", &main.token), Some(true));
        assert!(locks.contains_parent("workspace-window-a"));
        assert_eq!(
            locks.release("workspace-window-a", &workspace.token),
            Some(true)
        );
    }

    #[test]
    fn destroying_parent_discards_all_its_locks() {
        let mut locks = DialogInputLocks::default();
        let first = locks.acquire("main", true);
        let second = locks.acquire("main", true);

        assert_eq!(locks.window_destroyed("main"), 2);
        assert_eq!(locks.release("main", &first.token), None);
        assert_eq!(locks.release("main", &second.token), None);
    }
}

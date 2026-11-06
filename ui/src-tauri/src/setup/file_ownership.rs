use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileOwner {
    pub window_label: String,
    pub document_id: String,
    pub lease_id: String,
}

pub struct FileIdentity {
    path: PathBuf,
    handle: same_file::Handle,
}

impl FileIdentity {
    pub fn resolve(path: &Path) -> std::io::Result<Self> {
        let path = path.canonicalize()?;
        let handle = same_file::Handle::from_path(&path)?;
        Ok(Self { path, handle })
    }

    fn same_file(&self, other: &Self) -> bool {
        self.path == other.path || self.handle == other.handle
    }
}

#[derive(Default)]
pub struct FileOwnership {
    claims: HashMap<(String, String), (FileIdentity, FileOwner)>,
}

impl FileOwnership {
    pub fn claim(&mut self, identity: FileIdentity, owner: FileOwner) -> Result<(), FileOwner> {
        for (existing, current_owner) in self.claims.values() {
            if existing.same_file(&identity)
                && (current_owner.window_label != owner.window_label
                    || current_owner.document_id != owner.document_id)
            {
                return Err(current_owner.clone());
            }
        }
        // 同一文档的新身份成功登记时原子替换旧 lease，失败则完整保留旧占用。
        self.release_document(&owner.window_label, &owner.document_id);
        self.claims.insert(
            (owner.window_label.clone(), owner.lease_id.clone()),
            (identity, owner),
        );
        Ok(())
    }

    pub fn release(&mut self, window: &str, lease: &str) {
        self.claims.remove(&(window.to_string(), lease.to_string()));
    }
    pub fn release_window(&mut self, window: &str) {
        self.claims.retain(|(owner, _), _| owner != window);
    }
    pub fn release_document(&mut self, window: &str, document: &str) {
        self.claims
            .retain(|_, (_, owner)| owner.window_label != window || owner.document_id != document);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aliases_and_hard_links_cannot_create_two_writable_sessions() {
        let directory = std::env::temp_dir().join(format!(
            "lonanote-ownership-{}",
            lonanote_core::workspace::WorkspaceId::new()
        ));
        std::fs::create_dir_all(&directory).unwrap();
        let file = directory.join("note.md");
        let alias = directory.join("alias.md");
        std::fs::write(&file, "note").unwrap();
        std::fs::hard_link(&file, &alias).unwrap();
        let mut claims = FileOwnership::default();
        let owner = FileOwner {
            window_label: "a".into(),
            document_id: "doc-a".into(),
            lease_id: "a-0".into(),
        };
        claims
            .claim(FileIdentity::resolve(&file).unwrap(), owner.clone())
            .unwrap();
        let foreign = FileOwner {
            window_label: "b".into(),
            document_id: "doc-b".into(),
            lease_id: "b-0".into(),
        };
        assert_eq!(
            claims.claim(FileIdentity::resolve(&alias).unwrap(), foreign.clone()),
            Err(owner)
        );
        claims.release_window("b");
        assert!(claims
            .claim(FileIdentity::resolve(&alias).unwrap(), foreign.clone())
            .is_err());
        let replacement = FileOwner {
            window_label: "a".into(),
            document_id: "doc-a".into(),
            lease_id: "a-1".into(),
        };
        claims
            .claim(FileIdentity::resolve(&alias).unwrap(), replacement)
            .unwrap();
        assert_eq!(claims.claims.len(), 1, "同一文档身份交接不能残留旧 lease");
        claims.release("a", "a-0");
        assert!(claims
            .claim(FileIdentity::resolve(&alias).unwrap(), foreign.clone())
            .is_err());
        claims.release("a", "a-1");
        assert!(claims
            .claim(FileIdentity::resolve(&alias).unwrap(), foreign)
            .is_ok());
        drop(claims);
        std::fs::remove_file(file).unwrap();
        std::fs::remove_file(alias).unwrap();
        std::fs::remove_dir(directory).unwrap();
    }
}

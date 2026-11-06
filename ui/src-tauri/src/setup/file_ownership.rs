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
    handle: Option<same_file::Handle>,
}

impl FileIdentity {
    pub fn resolve(path: &Path) -> std::io::Result<Self> {
        let path = path.canonicalize()?;
        let handle = same_file::Handle::from_path(&path)?;
        Ok(Self {
            path,
            handle: Some(handle),
        })
    }

    /// 保存目标尚不存在时，以规范父目录和文件名预占，不能创建空文件冒充保存。
    pub fn resolve_target(path: &Path) -> std::io::Result<Self> {
        match Self::resolve(path) {
            Ok(identity) => Ok(identity),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                let parent = path
                    .parent()
                    .ok_or_else(|| std::io::Error::other("缺少父目录"))?
                    .canonicalize()?;
                let name = path
                    .file_name()
                    .ok_or_else(|| std::io::Error::other("缺少文件名"))?;
                Ok(Self {
                    path: parent.join(name),
                    handle: None,
                })
            }
            Err(error) => Err(error),
        }
    }

    fn same_file(&self, other: &Self) -> bool {
        let same_path = if cfg!(windows) {
            self.path
                .to_string_lossy()
                .eq_ignore_ascii_case(&other.path.to_string_lossy())
        } else {
            self.path == other.path
        };
        same_path || matches!((&self.handle, &other.handle), (Some(a), Some(b)) if a == b)
    }
}

#[derive(Default)]
pub struct FileOwnership {
    claims: HashMap<(String, String), (FileIdentity, FileOwner)>,
}

impl FileOwnership {
    pub fn assert_transfer_access(&self, window: &str, roots: &[PathBuf]) -> Result<(), String> {
        self.assert_paths_unclaimed(Some(window), roots)
    }

    pub fn assert_overwrite_access(&self, roots: &[PathBuf]) -> Result<(), String> {
        // 未落盘/已删除的目标也按登记路径保护，不能因 metadata 缺失跳过。
        let normalized = |path: &Path| {
            let actual = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
            let simplified = dunce::simplified(&actual);
            if cfg!(any(windows, target_os = "macos", target_os = "ios")) {
                PathBuf::from(simplified.to_string_lossy().to_lowercase())
            } else {
                simplified.to_path_buf()
            }
        };
        for root in roots {
            let root = normalized(root);
            if self
                .claims
                .values()
                .any(|(identity, _)| normalized(&identity.path).starts_with(&root))
            {
                return Err("目标文件已在编辑器中打开，请先关闭后覆盖".into());
            }
        }
        self.assert_paths_unclaimed(None, roots)
    }

    fn assert_paths_unclaimed(
        &self,
        allowed_window: Option<&str>,
        roots: &[PathBuf],
    ) -> Result<(), String> {
        let foreign = self
            .claims
            .values()
            .filter(|(_, owner)| allowed_window != Some(owner.window_label.as_str()))
            .collect::<Vec<_>>();
        if foreign.is_empty() {
            return Ok(());
        }
        let mut pending = roots.to_vec();
        while let Some(path) = pending.pop() {
            let metadata = match std::fs::symlink_metadata(&path) {
                Ok(metadata) => metadata,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
                Err(error) => return Err(error.to_string()),
            };
            if metadata.file_type().is_symlink() {
                return Err("不能转移符号链接".into());
            }
            if metadata.is_dir() {
                for child in std::fs::read_dir(&path).map_err(|e| e.to_string())? {
                    pending.push(child.map_err(|e| e.to_string())?.path());
                }
            } else {
                let identity = FileIdentity::resolve(&path).map_err(|e| e.to_string())?;
                if foreign
                    .iter()
                    .any(|(claimed, _)| claimed.same_file(&identity))
                {
                    return Err(if allowed_window.is_some() {
                        "来源文件正在其他窗口中编辑"
                    } else {
                        "目标文件已在编辑器中打开，请先关闭后覆盖"
                    }
                    .into());
                }
            }
        }
        Ok(())
    }
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
    fn overwrite_rejects_own_loose_file_and_alias_even_after_deletion() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("own.md");
        let alias = dir.path().join("alias.md");
        std::fs::write(&file, "draft target").unwrap();
        std::fs::hard_link(&file, &alias).unwrap();
        let mut claims = FileOwnership::default();
        claims
            .claim(
                FileIdentity::resolve(&file).unwrap(),
                FileOwner {
                    window_label: "a".into(),
                    document_id: "own".into(),
                    lease_id: "a-0".into(),
                },
            )
            .unwrap();
        assert!(claims
            .assert_transfer_access("a", std::slice::from_ref(&file))
            .is_ok());
        assert!(claims
            .assert_overwrite_access(std::slice::from_ref(&file))
            .is_err());
        assert!(claims
            .assert_overwrite_access(std::slice::from_ref(&alias))
            .is_err());
        std::fs::remove_file(&file).unwrap();
        assert!(claims.assert_overwrite_access(&[file]).is_err());
        drop(claims);
    }

    #[test]
    fn missing_transfer_source_does_not_block_other_items() {
        let dir = tempfile::tempdir().unwrap();
        let foreign = dir.path().join("foreign.md");
        let valid = dir.path().join("valid.md");
        std::fs::write(&foreign, "foreign").unwrap();
        std::fs::write(&valid, "valid").unwrap();
        let mut claims = FileOwnership::default();
        claims
            .claim(
                FileIdentity::resolve(&foreign).unwrap(),
                FileOwner {
                    window_label: "b".into(),
                    document_id: "foreign".into(),
                    lease_id: "b-0".into(),
                },
            )
            .unwrap();
        assert!(claims
            .assert_transfer_access("a", &[dir.path().join("missing.md"), valid])
            .is_ok());
        assert!(claims.assert_transfer_access("a", &[foreign]).is_err());
    }

    #[test]
    fn missing_targets_are_reserved_without_creating_a_file() {
        let directory = std::env::temp_dir().join(format!(
            "lonanote-target-{}",
            lonanote_core::workspace::WorkspaceId::new()
        ));
        std::fs::create_dir_all(&directory).unwrap();
        let path = directory.join("new.md");
        let mut claims = FileOwnership::default();
        let a = FileOwner {
            window_label: "a".into(),
            document_id: "a".into(),
            lease_id: "a:1".into(),
        };
        claims
            .claim(FileIdentity::resolve_target(&path).unwrap(), a.clone())
            .unwrap();
        let b = FileOwner {
            window_label: "b".into(),
            document_id: "b".into(),
            lease_id: "b:1".into(),
        };
        assert_eq!(
            claims.claim(FileIdentity::resolve_target(&path).unwrap(), b.clone()),
            Err(a)
        );
        assert!(!path.exists());
        claims.release_window("a");
        claims
            .claim(FileIdentity::resolve_target(&path).unwrap(), b)
            .unwrap();
        drop(claims);
        std::fs::remove_dir(directory).unwrap();
    }

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

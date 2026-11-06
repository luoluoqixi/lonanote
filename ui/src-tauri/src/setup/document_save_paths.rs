use std::path::{Path, PathBuf};

pub fn is_within(path: &Path, root: &Path) -> bool {
    dunce::simplified(path).starts_with(dunce::simplified(root))
}

pub fn normalized_target(path: &Path) -> Result<PathBuf, String> {
    if !path.is_absolute() {
        return Err("保存目标必须是绝对路径".into());
    }
    let name = path.file_name().ok_or("缺少文件名")?;
    let parent = path
        .parent()
        .ok_or("缺少父目录")?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let path = parent.join(name);
    // 不跟随目标链接写入；父目录已规范化后再进行工作区归属判断。
    if let Ok(metadata) = std::fs::symlink_metadata(&path) {
        if !metadata.is_file() || metadata.file_type().is_symlink() {
            return Err("保存目标必须是普通文件".into());
        }
    }
    Ok(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn resolves_missing_target_without_creating_it() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("note.md");
        assert_eq!(
            normalized_target(&target).unwrap(),
            dir.path().canonicalize().unwrap().join("note.md")
        );
        assert!(!target.exists());
    }
    #[cfg(windows)]
    #[test]
    fn canonical_and_simplified_prefixes_match() {
        assert!(is_within(
            Path::new(r"\\?\E:\notes\sub\note.md"),
            Path::new(r"E:\notes")
        ));
        assert!(!is_within(
            Path::new(r"\\?\E:\notes-other\note.md"),
            Path::new(r"E:\notes")
        ));
    }
    #[cfg(unix)]
    #[test]
    fn replaced_parent_link_changes_normalized_target() {
        let dir = tempfile::tempdir().unwrap();
        let original = dir.path().join("parent");
        let other = dir.path().join("other");
        std::fs::create_dir(&original).unwrap();
        std::fs::create_dir(&other).unwrap();
        let path = original.join("note.md");
        let prepared = normalized_target(&path).unwrap();
        std::fs::remove_dir(&original).unwrap();
        std::os::unix::fs::symlink(&other, &original).unwrap();
        assert_ne!(normalized_target(&path).unwrap(), prepared);
    }
}

use crate::workspace::{
    StorageError, WorkspaceError, WorkspaceRelativePath, WorkspaceSettings, WorkspaceStorageSession,
};
use ignore::gitignore::{Gitignore, GitignoreBuilder};
use std::path::Path;

pub struct IndexIgnore {
    custom: Gitignore,
    layers: Vec<Gitignore>,
}
fn build(base: &str, text: &str) -> Gitignore {
    let mut builder = GitignoreBuilder::new(base);
    for line in text.lines() {
        if let Err(error) = builder.add_line(None, line) {
            log::warn!("忽略规则无效: {error}");
        }
    }
    // add_line 已校验每条规则，构建失败时使用无规则 matcher。
    builder.build().unwrap_or_else(|error| {
        log::warn!("忽略规则构建失败: {error}");
        Gitignore::empty()
    })
}
impl IndexIgnore {
    pub async fn load(
        session: &WorkspaceStorageSession,
        path: &WorkspaceRelativePath,
        settings: &WorkspaceSettings,
    ) -> Result<Self, WorkspaceError> {
        let custom = build("", &settings.custom_ignore);
        let mut result = Self {
            custom,
            layers: vec![],
        };
        let mut current = WorkspaceRelativePath::root();
        loop {
            if !current.is_root() && result.hidden(&current, true) {
                return Err(WorkspaceError::IndexPathHidden { path: current });
            }
            if settings.follow_gitignore {
                let ignore_path = current.join(&WorkspaceRelativePath::parse(".gitignore")?);
                match session.read(&ignore_path).await {
                    Ok(bytes) => {
                        let text = String::from_utf8_lossy(&bytes);
                        result.layers.push(build(current.as_str(), &text));
                    }
                    Err(StorageError::NotFound { .. }) => {}
                    Err(error) => return Err(error.into()),
                }
            }
            if current == *path {
                break;
            }
            let next = path
                .components()
                .nth(current.components().count())
                .expect("目标祖先链有效");
            current = current.join(&WorkspaceRelativePath::parse(next)?);
        }
        Ok(result)
    }
    pub fn hidden(&self, path: &WorkspaceRelativePath, is_dir: bool) -> bool {
        if path.components().next() == Some(".lonanote") {
            return true;
        }
        let p = Path::new(path.as_str());
        if self
            .custom
            .matched_path_or_any_parents(p, is_dir)
            .is_ignore()
        {
            return true;
        }
        let mut ignored = false;
        for layer in &self.layers {
            let matched = layer.matched(p, is_dir);
            if matched.is_ignore() {
                ignored = true;
            } else if matched.is_whitelist() {
                ignored = false;
            }
        }
        ignored
    }
}

use std::{cmp::Ordering, path::Path, sync::Arc};

use futures::future::BoxFuture;
use ignore::{
    gitignore::{Gitignore, GitignoreBuilder},
    Match,
};
use thiserror::Error;

use super::{FileNode, FileTree, FileTreeSortType};
use crate::workspace::{
    storage::{StorageEntryKind, StorageError, WorkspaceStorage},
    workspace_relative_path::WorkspaceRelativePath,
};

const ROOT_GITIGNORE_PATH: &str = ".gitignore";

/// 只依赖逻辑路径和 `WorkspaceStorage` 的通用文件树构建器。
///
/// 默认只展开目标目录的一层。调用方只有在明确请求时才应传入
/// `recursive = true`，避免 SAF、iCloud 等 provider 在启动时全量扫描。
pub struct WorkspaceFileTreeBuilder {
    storage: Arc<dyn WorkspaceStorage>,
    ignore_matcher: WorkspaceIgnoreMatcher,
    sort_type: FileTreeSortType,
}

impl WorkspaceFileTreeBuilder {
    pub async fn new(
        storage: Arc<dyn WorkspaceStorage>,
        sort_type: FileTreeSortType,
        follow_gitignore: bool,
        custom_ignore: &str,
    ) -> Result<Self, FileTreeError> {
        let ignore_matcher = WorkspaceIgnoreMatcher::new(follow_gitignore, custom_ignore)?;
        Ok(Self {
            storage,
            ignore_matcher,
            sort_type,
        })
    }

    pub async fn build(&self, recursive: bool) -> Result<FileTree, FileTreeError> {
        Ok(FileTree {
            root: self
                .build_node(WorkspaceRelativePath::root(), true, recursive, Vec::new())
                .await?,
            sort_type: self.sort_type.clone(),
            recursive,
        })
    }

    pub async fn build_entry(
        &self,
        path: WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<Option<FileNode>, FileTreeError> {
        let metadata = self.storage.metadata(&path).await?;
        let inherited_matchers = self.load_ancestor_gitignore_matchers(&path).await?;
        if self
            .ignore_matcher
            .is_ignored(&path, metadata.kind, &inherited_matchers)
        {
            return Ok(None);
        }

        Ok(Some(
            self.build_node(
                path,
                metadata.kind == StorageEntryKind::Directory,
                recursive,
                inherited_matchers,
            )
            .await?,
        ))
    }

    fn build_node<'a>(
        &'a self,
        path: WorkspaceRelativePath,
        expand_directory: bool,
        recursive: bool,
        inherited_matchers: Vec<Gitignore>,
    ) -> BoxFuture<'a, Result<FileNode, FileTreeError>> {
        Box::pin(async move {
            let metadata = self.storage.metadata(&path).await?;
            let mut node = FileNode::from_metadata(path.clone(), metadata);
            if !node.is_directory() || !expand_directory {
                return Ok(node);
            }

            let mut directory_matchers = inherited_matchers;
            if let Some(matcher) = self
                .ignore_matcher
                .load_directory_gitignore(self.storage.as_ref(), &path)
                .await?
            {
                directory_matchers.push(matcher);
            }

            let entries = self.storage.list_dir(&path).await?;
            let mut children = Vec::with_capacity(entries.len());
            for entry in entries {
                if entry.path.parent().as_ref() != Some(&path) {
                    return Err(FileTreeError::InvalidStorageEntry {
                        directory: path.clone(),
                        entry: entry.path,
                    });
                }
                if self.ignore_matcher.is_ignored(
                    &entry.path,
                    entry.metadata.kind,
                    &directory_matchers,
                ) {
                    continue;
                }

                let expand_child = recursive && entry.metadata.kind == StorageEntryKind::Directory;
                let child = if expand_child {
                    self.build_node(entry.path, true, true, directory_matchers.clone())
                        .await?
                } else {
                    FileNode::from_metadata(entry.path, entry.metadata)
                };
                children.push(child);
            }

            sort_nodes(&mut children, &self.sort_type);
            let (file_count, directory_count) = count_loaded_descendants(&children);
            node.file_count = file_count;
            node.directory_count = directory_count;
            node.children = Some(children);
            Ok(node)
        })
    }

    async fn load_ancestor_gitignore_matchers(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<Gitignore>, FileTreeError> {
        let Some(parent) = path.parent() else {
            return Ok(Vec::new());
        };

        let mut directories = vec![WorkspaceRelativePath::root()];
        let mut current = WorkspaceRelativePath::root();
        for component in parent.components() {
            current = current.join_name(
                &component
                    .parse()
                    .expect("WorkspaceRelativePath component 必须是合法 entry name"),
            );
            directories.push(current.clone());
        }

        let mut matchers = Vec::new();
        for directory in directories {
            if let Some(matcher) = self
                .ignore_matcher
                .load_directory_gitignore(self.storage.as_ref(), &directory)
                .await?
            {
                matchers.push(matcher);
            }
        }
        Ok(matchers)
    }
}

struct WorkspaceIgnoreMatcher {
    follow_gitignore: bool,
    custom_matcher: Gitignore,
}

impl WorkspaceIgnoreMatcher {
    fn new(follow_gitignore: bool, custom_ignore: &str) -> Result<Self, FileTreeError> {
        let mut builder = GitignoreBuilder::new("");
        add_ignore_lines(&mut builder, "customIgnore", custom_ignore)?;
        let custom_matcher =
            builder
                .build()
                .map_err(|error| FileTreeError::InvalidIgnorePattern {
                    rule_source: "combined".to_string(),
                    line: 0,
                    message: error.to_string(),
                })?;
        Ok(Self {
            follow_gitignore,
            custom_matcher,
        })
    }

    async fn load_directory_gitignore(
        &self,
        storage: &dyn WorkspaceStorage,
        directory: &WorkspaceRelativePath,
    ) -> Result<Option<Gitignore>, FileTreeError> {
        if !self.follow_gitignore {
            return Ok(None);
        }

        let gitignore_name = ROOT_GITIGNORE_PATH
            .parse()
            .expect("内置 .gitignore 名称必须合法");
        let gitignore_path = directory.join_name(&gitignore_name);
        if !storage.exists(&gitignore_path).await? {
            return Ok(None);
        }

        let bytes = storage.read(&gitignore_path).await?;
        let contents =
            String::from_utf8(bytes).map_err(|error| FileTreeError::InvalidGitignoreEncoding {
                path: gitignore_path.clone(),
                message: error.to_string(),
            })?;
        let mut builder = GitignoreBuilder::new(Path::new(directory.as_str()));
        add_ignore_lines(&mut builder, gitignore_path.as_str(), &contents)?;
        let matcher = builder
            .build()
            .map_err(|error| FileTreeError::InvalidIgnorePattern {
                rule_source: gitignore_path.into_string(),
                line: 0,
                message: error.to_string(),
            })?;
        Ok(Some(matcher))
    }

    fn is_ignored(
        &self,
        path: &WorkspaceRelativePath,
        kind: StorageEntryKind,
        gitignore_matchers: &[Gitignore],
    ) -> bool {
        if path.is_root() {
            return false;
        }

        let path = Path::new(path.as_str());
        let is_directory = kind == StorageEntryKind::Directory;
        match self
            .custom_matcher
            .matched_path_or_any_parents(path, is_directory)
        {
            Match::Ignore(_) => return true,
            Match::Whitelist(_) => return false,
            Match::None => {}
        }

        for matcher in gitignore_matchers.iter().rev() {
            match matcher.matched_path_or_any_parents(path, is_directory) {
                Match::Ignore(_) => return true,
                Match::Whitelist(_) => return false,
                Match::None => {}
            }
        }
        false
    }
}

fn add_ignore_lines(
    builder: &mut GitignoreBuilder,
    source: &str,
    contents: &str,
) -> Result<(), FileTreeError> {
    for (index, line) in contents.lines().enumerate() {
        builder
            .add_line(None, line)
            .map_err(|error| FileTreeError::InvalidIgnorePattern {
                rule_source: source.to_string(),
                line: index + 1,
                message: error.to_string(),
            })?;
    }
    Ok(())
}

fn sort_nodes(nodes: &mut [FileNode], sort_type: &FileTreeSortType) {
    nodes.sort_by(|left, right| {
        let directory_order = right.is_directory().cmp(&left.is_directory());
        if directory_order != Ordering::Equal {
            return directory_order;
        }

        let ordering = match sort_type {
            FileTreeSortType::Name | FileTreeSortType::NameRev => compare_name(left, right),
            FileTreeSortType::LastModifiedTime | FileTreeSortType::LastModifiedTimeRev => {
                compare_optional_time(left.modified_time, right.modified_time)
                    .then_with(|| compare_name(left, right))
            }
            FileTreeSortType::CreateTime | FileTreeSortType::CreateTimeRev => {
                compare_optional_time(left.created_time, right.created_time)
                    .then_with(|| compare_name(left, right))
            }
        };

        match sort_type {
            FileTreeSortType::NameRev
            | FileTreeSortType::LastModifiedTimeRev
            | FileTreeSortType::CreateTimeRev => ordering.reverse(),
            _ => ordering,
        }
    });
}

fn compare_name(left: &FileNode, right: &FileNode) -> Ordering {
    alphanumeric_sort::compare_str(
        left.path.file_name().unwrap_or_default(),
        right.path.file_name().unwrap_or_default(),
    )
}

fn compare_optional_time(left: Option<u64>, right: Option<u64>) -> Ordering {
    match (left, right) {
        (Some(left), Some(right)) => left.cmp(&right),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

fn count_loaded_descendants(children: &[FileNode]) -> (usize, usize) {
    children
        .iter()
        .fold((0, 0), |(file_count, directory_count), child| {
            match child.kind {
                StorageEntryKind::File => (file_count + 1, directory_count),
                StorageEntryKind::Directory => (
                    file_count + child.file_count,
                    directory_count + 1 + child.directory_count,
                ),
            }
        })
}

#[derive(Debug, Error)]
pub enum FileTreeError {
    #[error(transparent)]
    Storage(#[from] StorageError),
    #[error(".gitignore 不是 UTF-8 文本（{path}）: {message}")]
    InvalidGitignoreEncoding {
        path: WorkspaceRelativePath,
        message: String,
    },
    #[error("storage.list_dir({directory}) 返回了非直接子路径: {entry}")]
    InvalidStorageEntry {
        directory: WorkspaceRelativePath,
        entry: WorkspaceRelativePath,
    },
    #[error("忽略规则无效（{rule_source}:{line}）: {message}")]
    InvalidIgnorePattern {
        rule_source: String,
        line: usize,
        message: String,
    },
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use crate::workspace::storage::{
        LocalPathStorage, MemoryStorage, WorkspaceStorage, WriteOptions,
    };

    use super::*;

    async fn write(storage: &dyn WorkspaceStorage, path: &str, contents: &str) {
        storage
            .write(
                &WorkspaceRelativePath::parse(path).unwrap(),
                contents.as_bytes(),
                WriteOptions::default(),
            )
            .await
            .unwrap();
    }

    async fn run_file_tree_contract(storage: Arc<dyn WorkspaceStorage>) {
        write(storage.as_ref(), ".gitignore", "ignored.md\ncache/\n").await;
        write(storage.as_ref(), "note10.md", "10").await;
        write(storage.as_ref(), "note2.md", "2").await;
        write(storage.as_ref(), "ignored.md", "ignored").await;
        write(storage.as_ref(), "cache/data.bin", "ignored").await;
        write(storage.as_ref(), "drafts/private.md", "ignored").await;
        write(storage.as_ref(), "notes/today.md", "visible").await;
        write(storage.as_ref(), "nested/.gitignore", "secret.md\n").await;
        write(storage.as_ref(), "nested/secret.md", "ignored").await;
        write(storage.as_ref(), "nested/visible.md", "visible").await;

        let builder = WorkspaceFileTreeBuilder::new(
            Arc::clone(&storage),
            FileTreeSortType::Name,
            true,
            "drafts/\n",
        )
        .await
        .unwrap();

        let shallow = builder.build(false).await.unwrap();
        let paths = shallow
            .root
            .children
            .as_ref()
            .unwrap()
            .iter()
            .map(|node| node.path.as_str())
            .collect::<Vec<_>>();
        assert_eq!(
            paths,
            ["nested", "notes", ".gitignore", "note2.md", "note10.md"]
        );
        assert_eq!(shallow.root.file_count, 3);
        assert_eq!(shallow.root.directory_count, 2);
        assert!(shallow.root.children.as_ref().unwrap()[0]
            .children
            .is_none());

        let recursive = builder.build(true).await.unwrap();
        let notes = recursive
            .root
            .children
            .as_ref()
            .unwrap()
            .iter()
            .find(|node| node.path.as_str() == "notes")
            .unwrap();
        assert_eq!(notes.file_count, 1);
        let nested = recursive
            .root
            .children
            .as_ref()
            .unwrap()
            .iter()
            .find(|node| node.path.as_str() == "nested")
            .unwrap();
        assert_eq!(recursive.root.file_count, 6);
        assert_eq!(recursive.root.directory_count, 2);
        assert_eq!(
            notes.children.as_ref().unwrap()[0].path.as_str(),
            "notes/today.md"
        );
        assert!(nested
            .children
            .as_ref()
            .unwrap()
            .iter()
            .any(|node| node.path.as_str() == "nested/visible.md"));
        assert!(!nested
            .children
            .as_ref()
            .unwrap()
            .iter()
            .any(|node| node.path.as_str() == "nested/secret.md"));
        assert!(builder
            .build_entry(
                WorkspaceRelativePath::parse("nested/secret.md").unwrap(),
                false,
            )
            .await
            .unwrap()
            .is_none());

        let without_gitignore =
            WorkspaceFileTreeBuilder::new(storage, FileTreeSortType::Name, false, "")
                .await
                .unwrap()
                .build(true)
                .await
                .unwrap();
        assert!(without_gitignore
            .root
            .children
            .as_ref()
            .unwrap()
            .iter()
            .any(|node| node.path.as_str() == "ignored.md"));
    }

    #[tokio::test]
    async fn memory_storage_builds_provider_neutral_tree() {
        run_file_tree_contract(Arc::new(MemoryStorage::new())).await;
    }

    #[tokio::test]
    async fn local_storage_builds_provider_neutral_tree() {
        let directory =
            std::env::temp_dir().join(format!("lonanote-file-tree-test-{}", uuid::Uuid::new_v4()));
        run_file_tree_contract(Arc::new(LocalPathStorage::new(&directory).unwrap())).await;
        std::fs::remove_dir_all(directory).unwrap();
    }

    #[tokio::test]
    async fn an_ignored_entry_is_not_returned_directly() {
        let storage = Arc::new(MemoryStorage::new());
        write(storage.as_ref(), "private/secret.md", "secret").await;
        let builder =
            WorkspaceFileTreeBuilder::new(storage, FileTreeSortType::Name, false, "private/\n")
                .await
                .unwrap();

        assert!(builder
            .build_entry(
                WorkspaceRelativePath::parse("private/secret.md").unwrap(),
                false,
            )
            .await
            .unwrap()
            .is_none());
    }
}

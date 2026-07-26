use futures::future::BoxFuture;

use super::{StorageEntryKind, StorageError, WorkspaceStorage, WriteOptions};
use crate::workspace::workspace_relative_path::WorkspaceRelativePath;

/// 在同一个 Workspace storage 内移动文件或目录。
///
/// provider 支持原生 rename/move 时优先使用；否则使用递归 copy + delete。
/// fallback 不是原子操作，复制失败时会尽力清理目标，删除源失败时会保留
/// 已复制的目标并返回明确错误。
pub async fn move_entry(
    storage: &dyn WorkspaceStorage,
    from: &WorkspaceRelativePath,
    to: &WorkspaceRelativePath,
) -> Result<(), StorageError> {
    let source_kind = validate_move_paths(storage, from, to).await?;
    let capabilities = storage.capabilities().await?;
    let same_parent = from.parent() == to.parent();

    if (same_parent && capabilities.can_rename) || (!same_parent && capabilities.can_move) {
        return storage.rename(from, to).await;
    }

    if !capabilities.can_read
        || !capabilities.can_write
        || !capabilities.can_delete
        || (source_kind == StorageEntryKind::Directory && !capabilities.can_create_directory)
    {
        return Err(StorageError::Unsupported {
            operation: "move entry",
        });
    }

    if let Err(error) = copy_entry(storage, from.clone(), to.clone()).await {
        let _ = storage.remove(to, true).await;
        return Err(error);
    }

    if let Err(error) = storage.remove(from, true).await {
        return Err(StorageError::Io {
            operation: "commit move",
            message: format!("目标已复制到 {to}，但删除源 {from} 失败；两处内容均被保留: {error}"),
        });
    }
    Ok(())
}

async fn validate_move_paths(
    storage: &dyn WorkspaceStorage,
    from: &WorkspaceRelativePath,
    to: &WorkspaceRelativePath,
) -> Result<StorageEntryKind, StorageError> {
    if from.is_root() || to.is_root() {
        return Err(StorageError::CannotModifyRoot);
    }
    if to.starts_with(from) {
        return Err(StorageError::Io {
            operation: "move",
            message: "不能把目录移动到自身内部".to_string(),
        });
    }
    let source_kind = storage.metadata(from).await?.kind;
    if storage.exists(to).await? {
        return Err(StorageError::AlreadyExists { path: to.clone() });
    }

    let parent = to.parent().unwrap_or_else(WorkspaceRelativePath::root);
    let parent_metadata = storage.metadata(&parent).await?;
    if parent_metadata.kind != StorageEntryKind::Directory {
        return Err(StorageError::NotDirectory { path: parent });
    }
    Ok(source_kind)
}

fn copy_entry<'a>(
    storage: &'a dyn WorkspaceStorage,
    from: WorkspaceRelativePath,
    to: WorkspaceRelativePath,
) -> BoxFuture<'a, Result<(), StorageError>> {
    Box::pin(async move {
        let metadata = storage.metadata(&from).await?;
        match metadata.kind {
            StorageEntryKind::File => {
                let data = storage.read(&from).await?;
                storage
                    .write(
                        &to,
                        &data,
                        WriteOptions {
                            overwrite: false,
                            create_parent: false,
                        },
                    )
                    .await
            }
            StorageEntryKind::Directory => {
                storage.create_dir_all(&to).await?;
                for entry in storage.list_dir(&from).await? {
                    if entry.path.parent().as_ref() != Some(&from) {
                        return Err(StorageError::OutsideMount { path: entry.path });
                    }
                    let name = entry
                        .path
                        .file_name()
                        .expect("直接子路径必须包含 entry name")
                        .parse()?;
                    copy_entry(storage, entry.path, to.join_name(&name)).await?;
                }
                Ok(())
            }
        }
    })
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use async_trait::async_trait;

    use super::*;
    use crate::workspace::storage::{
        MemoryStorage, StorageCapabilities, StorageEntry, StorageEntryMetadata,
    };

    struct CopyDeleteOnlyStorage {
        inner: Arc<MemoryStorage>,
    }

    #[async_trait]
    impl WorkspaceStorage for CopyDeleteOnlyStorage {
        async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
            let mut capabilities = StorageCapabilities::memory();
            capabilities.can_rename = false;
            capabilities.can_move = false;
            Ok(capabilities)
        }

        async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError> {
            self.inner.exists(path).await
        }

        async fn metadata(
            &self,
            path: &WorkspaceRelativePath,
        ) -> Result<StorageEntryMetadata, StorageError> {
            self.inner.metadata(path).await
        }

        async fn list_dir(
            &self,
            path: &WorkspaceRelativePath,
        ) -> Result<Vec<StorageEntry>, StorageError> {
            self.inner.list_dir(path).await
        }

        async fn read(&self, path: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError> {
            self.inner.read(path).await
        }

        async fn write(
            &self,
            path: &WorkspaceRelativePath,
            data: &[u8],
            options: WriteOptions,
        ) -> Result<(), StorageError> {
            self.inner.write(path, data, options).await
        }

        async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError> {
            self.inner.create_dir_all(path).await
        }

        async fn rename(
            &self,
            _from: &WorkspaceRelativePath,
            _to: &WorkspaceRelativePath,
        ) -> Result<(), StorageError> {
            Err(StorageError::Unsupported {
                operation: "rename",
            })
        }

        async fn remove(
            &self,
            path: &WorkspaceRelativePath,
            recursive: bool,
        ) -> Result<(), StorageError> {
            self.inner.remove(path, recursive).await
        }
    }

    #[tokio::test]
    async fn move_falls_back_to_recursive_copy_and_delete() {
        let inner = Arc::new(MemoryStorage::new());
        let storage = CopyDeleteOnlyStorage {
            inner: Arc::clone(&inner),
        };
        inner
            .write(
                &WorkspaceRelativePath::parse("notes/a.md").unwrap(),
                b"a",
                WriteOptions::default(),
            )
            .await
            .unwrap();
        inner
            .create_dir_all(&WorkspaceRelativePath::parse("archive").unwrap())
            .await
            .unwrap();

        move_entry(
            &storage,
            &WorkspaceRelativePath::parse("notes").unwrap(),
            &WorkspaceRelativePath::parse("archive/notes").unwrap(),
        )
        .await
        .unwrap();

        assert!(!inner
            .exists(&WorkspaceRelativePath::parse("notes").unwrap())
            .await
            .unwrap());
        assert_eq!(
            inner
                .read(&WorkspaceRelativePath::parse("archive/notes/a.md").unwrap())
                .await
                .unwrap(),
            b"a"
        );
    }
}

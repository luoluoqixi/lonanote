use crate::workspace::{
    StorageError, TransferOperation, WorkspaceError, WorkspaceRelativePath, WorkspaceStorageSession,
};

/// 显式覆盖先保留旧目标；提交失败恢复，恢复失败也绝不删除备份。
pub(super) async fn replace_entry(
    session: &WorkspaceStorageSession,
    source: &WorkspaceRelativePath,
    target: &WorkspaceRelativePath,
    operation: TransferOperation,
) -> Result<Option<String>, WorkspaceError> {
    let parent = target.parent().ok_or(StorageError::CannotModifyRoot)?;
    let backup = parent.join(&WorkspaceRelativePath::parse(format!(
        ".lonanote-transfer-backup-{}",
        uuid::Uuid::new_v4()
    ))?);
    // copy_entry_staged 自身使用不覆盖提交；源读取或 staging 失败不触碰旧目标。
    let staged = if operation == TransferOperation::Copy {
        let path = parent.join(&WorkspaceRelativePath::parse(format!(
            ".lonanote-transfer-ready-{}",
            uuid::Uuid::new_v4()
        ))?);
        session.copy_entry_staged(source, &path).await?;
        Some(path)
    } else {
        None
    };
    if let Err(error) = session.rename_no_replace(target, &backup).await {
        if let Some(path) = &staged {
            if let Err(cleanup) = session.remove(path, true).await {
                return Err(StorageError::io(
                    "overwrite_prepare",
                    format!("{error}; 临时副本清理失败，保留于 {path}: {cleanup}"),
                )
                .into());
            }
        }
        return Err(error.into());
    }
    let committed_source = staged.as_ref().unwrap_or(source);
    if let Err(error) = session.rename_no_replace(committed_source, target).await {
        let restore = session.rename_no_replace(&backup, target).await;
        let cleanup = if let Some(path) = &staged {
            session.remove(path, true).await.err()
        } else {
            None
        };
        let mut message = error.to_string();
        if let Err(restore) = restore {
            message.push_str(&format!("; 原目标恢复失败，备份保留于 {backup}: {restore}"));
        }
        if let Some(cleanup) = cleanup {
            message.push_str(&format!(
                "; 临时副本清理失败，保留于 {committed_source}: {cleanup}"
            ));
        }
        return Err(StorageError::io("overwrite_commit", message).into());
    }
    // 已成功提交时清理错误是 warning，不能把成功移动当作失败而丢失标签映射。
    Ok(session
        .remove(&backup, true)
        .await
        .err()
        .map(|error| format!("原目标备份清理失败，保留于 {backup}: {error}")))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::workspace::{MemoryStorage, WriteOptions};
    use std::sync::Arc;

    #[tokio::test]
    async fn failed_move_restores_original_target() {
        let session = WorkspaceStorageSession::new(Arc::new(MemoryStorage::new()));
        let source = WorkspaceRelativePath::parse("missing.md").unwrap();
        let target = WorkspaceRelativePath::parse("target.md").unwrap();
        session
            .write(&target, b"original", WriteOptions::default())
            .await
            .unwrap();
        assert!(
            replace_entry(&session, &source, &target, TransferOperation::Move)
                .await
                .is_err()
        );
        assert_eq!(session.read(&target).await.unwrap(), b"original");
        assert_eq!(
            session
                .list_dir(&WorkspaceRelativePath::root())
                .await
                .unwrap()
                .len(),
            1
        );
    }
}

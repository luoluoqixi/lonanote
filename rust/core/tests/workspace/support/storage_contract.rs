use lonanote_core::workspace::{
    StorageEntryKind, StorageError, WorkspaceRelativePath, WorkspaceStorage, WriteOptions,
};

use super::path;

/// 所有 Storage 实现都必须满足的可观察行为。
pub async fn assert_storage_contract(storage: &dyn WorkspaceStorage) {
    let root = WorkspaceRelativePath::root();
    let note = path("notes/today.md");
    let renamed = path("notes/renamed.md");
    let binary = path("assets/data.bin");

    assert!(storage.exists(&root).await.unwrap());
    assert_eq!(
        storage.metadata(&root).await.unwrap().kind,
        StorageEntryKind::Directory
    );

    storage
        .write(&note, b"hello", WriteOptions::default())
        .await
        .unwrap();
    storage
        .write(&binary, &[0, 1, 255], WriteOptions::default())
        .await
        .unwrap();
    assert_eq!(storage.read(&note).await.unwrap(), b"hello");
    assert_eq!(storage.read(&binary).await.unwrap(), [0, 1, 255]);
    assert_eq!(storage.metadata(&note).await.unwrap().size, Some(5));

    let root_children = storage.list_dir(&root).await.unwrap();
    assert_eq!(
        root_children
            .iter()
            .map(|entry| entry.path.as_str())
            .collect::<Vec<_>>(),
        ["assets", "notes"]
    );

    let overwrite_error = storage
        .write(
            &note,
            b"changed",
            WriteOptions {
                overwrite: false,
                create_parent: true,
                atomic: false,
            },
        )
        .await
        .unwrap_err();
    assert!(matches!(
        overwrite_error,
        StorageError::AlreadyExists { .. }
    ));
    assert_eq!(storage.read(&note).await.unwrap(), b"hello");

    let missing_parent = path("missing/child/file.md");
    let parent_error = storage
        .write(
            &missing_parent,
            b"no parent",
            WriteOptions {
                overwrite: true,
                create_parent: false,
                atomic: false,
            },
        )
        .await
        .unwrap_err();
    assert!(matches!(parent_error, StorageError::NotFound { .. }));

    storage.rename(&note, &renamed).await.unwrap();
    assert!(!storage.exists(&note).await.unwrap());
    assert_eq!(storage.read(&renamed).await.unwrap(), b"hello");
    assert!(matches!(
        storage.remove(&path("notes"), false).await.unwrap_err(),
        StorageError::DirectoryNotEmpty { .. }
    ));
    storage.remove(&path("notes"), true).await.unwrap();
    assert!(!storage.exists(&renamed).await.unwrap());

    assert!(matches!(
        storage.read(&path("not-found.md")).await.unwrap_err(),
        StorageError::NotFound { .. }
    ));
    assert!(matches!(
        storage.remove(&root, true).await.unwrap_err(),
        StorageError::CannotModifyRoot
    ));
}

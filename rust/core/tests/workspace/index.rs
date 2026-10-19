use crate::support::{index_storage::RecordingStorage, path, resolved_external_binding};
use lonanote_core::workspace::*;
use std::sync::Arc;
async fn instance(storage: Arc<dyn WorkspaceStorage>) -> WorkspaceInstance {
    WorkspaceInstance::new(
        resolved_external_binding("/virtual"),
        Arc::new(WorkspaceStorageSession::new(storage)),
        WorkspaceManifest::new(WorkspaceId::new(), "Index".into(), 1),
        WorkspaceSettings::default(),
        WorkspaceLocalSetting::default(),
        WorkspaceState::default(),
    )
    .await
    .unwrap()
}
async fn fixture() -> (Arc<RecordingStorage>, Arc<WorkspaceInstance>) {
    let storage = Arc::new(RecordingStorage::new(Arc::new(MemoryStorage::new())));
    storage
        .write(&path("A/sub/deep.md"), b"deep", WriteOptions::default())
        .await
        .unwrap();
    storage
        .write(&path("root.md"), b"root", WriteOptions::default())
        .await
        .unwrap();
    let i = Arc::new(instance(storage.clone()).await);
    (storage, i)
}
#[tokio::test]
async fn initial_root_only_and_memory_index_succeeds() {
    let (s, i) = fixture().await;
    let root = i.get_directory(&path(""), true).await.unwrap();
    assert_eq!(s.list_paths(), vec![""]);
    assert!(root.entries.iter().any(|e| e.path.as_str() == "A"));
    let a = i.get_directory(&path("A"), true).await.unwrap();
    assert_eq!(a.entries[0].path.as_str(), "A/sub");
    assert_eq!(s.list_paths(), vec!["", "A"]);
    let json = serde_json::to_value(a).unwrap();
    assert!(json["entries"][0].get("children").is_none());
    assert!(json["entries"][0].get("fileCount").is_none());
}
#[tokio::test]
async fn cached_read_and_reload_sees_external_changes() {
    let (s, i) = fixture().await;
    i.get_directory(&path("A"), true).await.unwrap();
    s.inner
        .write(&path("A/new.md"), b"new", WriteOptions::default())
        .await
        .unwrap();
    assert_eq!(
        i.get_directory(&path("A"), false)
            .await
            .unwrap()
            .entries
            .len(),
        1
    );
    assert_eq!(
        i.get_directory(&path("A"), true)
            .await
            .unwrap()
            .entries
            .len(),
        2
    );
    assert_eq!(s.list_paths(), vec!["A", "A"]);
    i.refresh_index().await.unwrap();
    assert_eq!(s.list_paths(), vec!["A", "A"]);
    assert_eq!(
        i.get_directory(&path("A"), false)
            .await
            .unwrap()
            .entries
            .len(),
        2
    );
}
#[tokio::test]
async fn nested_ignore_reinclude_and_hidden_ancestor() {
    let (s, i) = fixture().await;
    s.write(
        &path(".gitignore"),
        b"hidden/\n*.tmp\n",
        WriteOptions::default(),
    )
    .await
    .unwrap();
    s.write(
        &path("A/.gitignore"),
        b"!keep.tmp\nsub/\n",
        WriteOptions::default(),
    )
    .await
    .unwrap();
    for p in ["A/keep.tmp", "A/drop.tmp", "hidden/a.md"] {
        s.write(&path(p), b"x", WriteOptions::default())
            .await
            .unwrap();
    }
    let a = i.get_directory(&path("A"), true).await.unwrap();
    assert!(a.entries.iter().any(|e| e.path.as_str() == "A/keep.tmp"));
    assert!(!a
        .entries
        .iter()
        .any(|e| e.path.as_str() == "A/drop.tmp" || e.path.as_str() == "A/sub"));
    assert!(matches!(
        i.get_directory(&path("hidden"), true).await,
        Err(WorkspaceError::IndexPathHidden { .. })
    ));
    assert!(matches!(
        i.get_directory(&path("A/sub"), true).await,
        Err(WorkspaceError::IndexPathHidden { .. })
    ));
    assert!(!s.list_paths().contains(&"hidden".into()));
}
#[tokio::test]
async fn directory_error_retry_and_empty_are_distinct() {
    let (s, i) = fixture().await;
    *s.fail.lock().unwrap() = Some("A".into());
    assert!(matches!(
        i.get_directory(&path("A"), true).await,
        Err(WorkspaceError::Storage(StorageError::Offline))
    ));
    *s.fail.lock().unwrap() = None;
    assert_eq!(
        i.get_directory(&path("A"), true)
            .await
            .unwrap()
            .entries
            .len(),
        1
    );
    s.create_dir_all(&path("empty")).await.unwrap();
    assert!(i
        .get_directory(&path("empty"), true)
        .await
        .unwrap()
        .entries
        .is_empty());
}
#[tokio::test]
async fn late_read_after_invalidation_retries() {
    let (s, i) = fixture().await;
    *s.pause.lock().unwrap() = true;
    let task = tokio::spawn({
        let i = i.clone();
        async move { i.get_directory(&path("A"), true).await }
    });
    s.entered.notified().await;
    i.write_text(&path("A/new.md"), "new", WriteOptions::default())
        .await
        .unwrap();
    s.release.notify_one();
    assert_eq!(task.await.unwrap().unwrap().entries.len(), 2);
    assert_eq!(
        i.get_directory(&path("A"), false)
            .await
            .unwrap()
            .entries
            .len(),
        2
    );
}
#[tokio::test]
async fn create_parent_cross_directory_and_ignore_mutation_invalidation() {
    let (_s, i) = fixture().await;
    i.get_directory(&path(""), true).await.unwrap();
    i.get_directory(&path("A"), true).await.unwrap();
    i.write_text(&path("new/child/n.md"), "x", WriteOptions::default())
        .await
        .unwrap();
    assert!(i
        .get_directory(&path(""), false)
        .await
        .unwrap()
        .entries
        .iter()
        .any(|e| e.path.as_str() == "new"));
    i.rename(&path("root.md"), &path("A/moved.md"))
        .await
        .unwrap();
    assert!(i
        .get_directory(&path("A"), false)
        .await
        .unwrap()
        .entries
        .iter()
        .any(|e| e.path.as_str() == "A/moved.md"));
    i.write_text(&path(".gitignore"), "A/", WriteOptions::default())
        .await
        .unwrap();
    assert!(!i
        .get_directory(&path(""), false)
        .await
        .unwrap()
        .entries
        .iter()
        .any(|e| e.path.as_str() == "A"));
}

#[tokio::test]
async fn local_and_memory_share_ignore_and_optional_metadata_contract() {
    let root = tempfile::TempDir::new().unwrap();
    let providers: Vec<Arc<dyn WorkspaceStorage>> = vec![
        Arc::new(MemoryStorage::new()),
        Arc::new(LocalPathStorage::open(root.path()).unwrap()),
    ];
    for provider in providers {
        let mut recording = RecordingStorage::new(provider);
        recording.omit_metadata = true;
        let storage = Arc::new(recording);
        for (name, data) in [
            (".gitignore", "*.tmp\n!.lonanote/\n"),
            ("A/.gitignore", "!keep.tmp\n"),
            ("A/keep.tmp", "keep"),
            ("A/drop.tmp", "drop"),
            (".lonanote/private.md", "hidden"),
        ] {
            storage
                .write(&path(name), data.as_bytes(), WriteOptions::default())
                .await
                .unwrap();
        }
        let i = instance(storage.clone()).await;
        let value = i.get_directory(&path("A"), true).await.unwrap();
        assert!(value
            .entries
            .iter()
            .any(|e| e.path.as_str() == "A/keep.tmp"));
        assert!(!value
            .entries
            .iter()
            .any(|e| e.path.as_str() == "A/drop.tmp"));
        let entry = value
            .entries
            .iter()
            .find(|e| e.path.as_str() == "A/keep.tmp")
            .unwrap();
        assert_eq!(
            serde_json::to_value(entry).unwrap(),
            serde_json::json!({"path":"A/keep.tmp","fileType":"file","lastModifiedTime":null,"createTime":null,"size":null})
        );
        assert!(matches!(
            i.get_directory(&path(".lonanote"), true).await,
            Err(WorkspaceError::IndexPathHidden { .. })
        ));
        *storage.fail_reads.lock().unwrap() = Some("A/.gitignore".into());
        assert!(matches!(
            i.get_directory(&path("A"), true).await,
            Err(WorkspaceError::Storage(StorageError::Offline))
        ));
        *storage.fail_reads.lock().unwrap() = None;
        let mut settings = i.settings().await;
        settings.follow_gitignore = false;
        settings.custom_ignore = "keep.tmp".into();
        i.set_settings(settings).await.unwrap();
        let value = i.get_directory(&path("A"), false).await.unwrap();
        assert!(!value
            .entries
            .iter()
            .any(|e| e.path.as_str() == "A/keep.tmp"));
        assert!(value
            .entries
            .iter()
            .any(|e| e.path.as_str() == "A/drop.tmp"));
    }
}

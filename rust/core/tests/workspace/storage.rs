use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use crate::support::{assert_storage_contract, external_binding, path};
use lonanote_core::workspace::{
    copy_workspace_tree, load_local_setting, load_manifest, load_workspace_settings,
    save_local_setting, save_manifest, save_workspace_settings, LocalPathStorage, MemoryStorage,
    StorageAccessLease, StorageError, WorkspaceError, WorkspaceId, WorkspaceInstance,
    WorkspaceLocalSetting, WorkspaceManifest, WorkspaceSettings, WorkspaceStorage,
    WorkspaceStorageSession, WriteOptions,
};
use tempfile::TempDir;

#[tokio::test]
async fn memory_contract() {
    assert_storage_contract(&MemoryStorage::new()).await;
}

#[tokio::test]
async fn local_contract() {
    let root = TempDir::new().unwrap();
    assert_storage_contract(&LocalPathStorage::open(root.path()).unwrap()).await;
}

#[tokio::test]
async fn local_atomic_write_and_symlink_guard() {
    let root = TempDir::new().unwrap();
    let outside = TempDir::new().unwrap();
    let storage = LocalPathStorage::open(root.path()).unwrap();
    let note = path("note.md");
    storage
        .write(&note, b"before", WriteOptions::default())
        .await
        .unwrap();
    storage
        .write(&note, b"after", WriteOptions::atomic_replace())
        .await
        .unwrap();
    assert_eq!(storage.read(&note).await.unwrap(), b"after");

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;

        std::fs::write(outside.path().join("secret.md"), "secret").unwrap();
        symlink(outside.path(), root.path().join("escape")).unwrap();
        let escaped = path("escape/secret.md");
        assert!(matches!(
            storage.read(&escaped).await.unwrap_err(),
            StorageError::OutsideWorkspace { .. }
        ));
        assert!(matches!(
            storage
                .write(&escaped, b"changed", WriteOptions::default())
                .await
                .unwrap_err(),
            StorageError::OutsideWorkspace { .. }
        ));
        assert_eq!(
            std::fs::read_to_string(outside.path().join("secret.md")).unwrap(),
            "secret"
        );
    }
}

#[tokio::test]
async fn manifest_round_trip() {
    let storage: Arc<dyn WorkspaceStorage> = Arc::new(MemoryStorage::new());
    let session = WorkspaceStorageSession::new(storage);
    assert!(load_manifest(&session).await.unwrap().is_none());

    let manifest = WorkspaceManifest::new(WorkspaceId::new(), "测试空间".into(), 42);
    save_manifest(&session, &manifest).await.unwrap();
    assert_eq!(load_manifest(&session).await.unwrap(), Some(manifest));
}

#[tokio::test]
async fn settings_round_trip() {
    let session = WorkspaceStorageSession::new(Arc::new(MemoryStorage::new()));
    assert!(matches!(
        load_workspace_settings(&session).await.unwrap_err(),
        lonanote_core::workspace::WorkspaceError::SettingsNotFound
    ));
    let settings = WorkspaceSettings {
        history_snapshot_count: 42,
        ..WorkspaceSettings::default()
    };

    save_workspace_settings(&session, &settings).await.unwrap();

    assert_eq!(load_workspace_settings(&session).await.unwrap(), settings);
}

#[tokio::test]
async fn local_setting_defaults_and_round_trips() {
    let session = WorkspaceStorageSession::new(Arc::new(MemoryStorage::new()));
    assert_eq!(
        load_local_setting(&session).await.unwrap(),
        WorkspaceLocalSetting::default()
    );
    let setting = WorkspaceLocalSetting {
        last_opened_at: Some(10),
        last_open_file: Some(path("notes/today.md")),
        ..WorkspaceLocalSetting::default()
    };

    save_local_setting(&session, &setting).await.unwrap();

    assert_eq!(load_local_setting(&session).await.unwrap(), setting);
}

#[tokio::test]
async fn instance_rejects_invalid_settings() {
    let id = WorkspaceId::new();
    let settings = WorkspaceSettings {
        schema_version: 999,
        ..WorkspaceSettings::default()
    };

    let error = WorkspaceInstance::new(
        external_binding("/virtual/workspace"),
        Arc::new(WorkspaceStorageSession::new(Arc::new(MemoryStorage::new()))),
        WorkspaceManifest::new(id, "Invalid Settings".into(), 1),
        settings,
        WorkspaceLocalSetting::default(),
    )
    .await
    .unwrap_err();

    assert!(matches!(error, WorkspaceError::InvalidSettings(_)));
}

#[tokio::test]
async fn instance_rejects_invalid_local_setting() {
    let id = WorkspaceId::new();
    let local_setting = WorkspaceLocalSetting {
        schema_version: 999,
        ..WorkspaceLocalSetting::default()
    };

    let error = WorkspaceInstance::new(
        external_binding("/virtual/workspace"),
        Arc::new(WorkspaceStorageSession::new(Arc::new(MemoryStorage::new()))),
        WorkspaceManifest::new(id, "Invalid Local Setting".into(), 1),
        WorkspaceSettings::default(),
        local_setting,
    )
    .await
    .unwrap_err();

    assert!(matches!(error, WorkspaceError::InvalidLocalSetting(_)));
}

#[tokio::test]
async fn tree_copy() {
    let source = WorkspaceStorageSession::new(Arc::new(MemoryStorage::new()));
    let target = WorkspaceStorageSession::new(Arc::new(MemoryStorage::new()));
    source
        .write(&path("notes/a.md"), b"note", WriteOptions::default())
        .await
        .unwrap();
    source
        .write(&path("assets/data.bin"), &[0, 255], WriteOptions::default())
        .await
        .unwrap();

    copy_workspace_tree(&source, &target).await.unwrap();

    assert_eq!(target.read(&path("notes/a.md")).await.unwrap(), b"note");
    assert_eq!(
        target.read(&path("assets/data.bin")).await.unwrap(),
        [0, 255]
    );
}

#[tokio::test]
async fn session_owns_access_lease() {
    struct ProbeLease(Arc<AtomicBool>);
    impl StorageAccessLease for ProbeLease {}
    impl Drop for ProbeLease {
        fn drop(&mut self) {
            self.0.store(true, Ordering::SeqCst);
        }
    }

    let dropped = Arc::new(AtomicBool::new(false));
    let session = WorkspaceStorageSession::with_access_lease(
        Arc::new(MemoryStorage::new()),
        Box::new(ProbeLease(Arc::clone(&dropped))),
    );
    assert!(!dropped.load(Ordering::SeqCst));
    drop(session);
    assert!(dropped.load(Ordering::SeqCst));
}

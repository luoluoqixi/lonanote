use std::sync::Arc;

use crate::support::{external_binding, path, provider, WorkspaceTestApp, MANAGED_PROVIDER};
use lonanote_core::workspace::{
    FileTreeSortType, MemoryStorage, StorageError, WorkspaceError, WorkspaceId, WorkspaceInstance,
    WorkspaceManifest, WorkspaceSettings, WorkspaceStorage, WorkspaceStorageSession, WriteOptions,
};

#[tokio::test]
async fn file_crud_flow() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let workspace = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Files".into())
        .await
        .unwrap();
    let id = workspace.id;

    let note = path("notes/today.md");
    manager
        .write_text(&id, &note, "today", WriteOptions::default())
        .await
        .unwrap();
    assert!(manager.file_exists(&id, &note).await.unwrap());
    assert_eq!(manager.read_text(&id, &note).await.unwrap(), "today");
    assert_eq!(
        manager.file_metadata(&id, &note).await.unwrap().size,
        Some(5)
    );

    let binary = path("notes/data.bin");
    manager
        .write_bytes(&id, &binary, &[0xff, 0xfe], WriteOptions::default())
        .await
        .unwrap();
    assert_eq!(
        manager.read_bytes(&id, &binary).await.unwrap(),
        [0xff, 0xfe]
    );
    assert!(matches!(
        manager.read_text(&id, &binary).await.unwrap_err(),
        WorkspaceError::Utf8(_)
    ));

    let renamed = path("archive/today.md");
    manager
        .create_directory(&id, &path("archive"))
        .await
        .unwrap();
    manager.rename(&id, &note, &renamed).await.unwrap();
    assert!(!manager.file_exists(&id, &note).await.unwrap());
    assert_eq!(manager.read_text(&id, &renamed).await.unwrap(), "today");
    manager.remove(&id, &path("archive"), true).await.unwrap();
    assert!(!manager.file_exists(&id, &renamed).await.unwrap());
}

#[tokio::test]
async fn protects_metadata_directory() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let workspace = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Protected".into())
        .await
        .unwrap();
    let id = workspace.id;
    let manifest = path(".lonanote/manifest.json");

    assert!(manager.file_exists(&id, &manifest).await.unwrap());
    assert!(!manager.read_bytes(&id, &manifest).await.unwrap().is_empty());
    let error = manager
        .write_text(&id, &manifest, "{}", WriteOptions::default())
        .await
        .unwrap_err();
    assert!(matches!(
        error,
        WorkspaceError::Storage(StorageError::UnsupportedOperation {
            operation: "modify_workspace_metadata"
        })
    ));
    assert!(manager.remove(&id, &path(".lonanote"), true).await.is_err());
}

#[tokio::test]
async fn index_refresh_flow() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let workspace = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Index".into())
        .await
        .unwrap();
    let id = workspace.id;

    manager
        .write_text(&id, &path("z.md"), "z", WriteOptions::default())
        .await
        .unwrap();
    manager
        .write_text(&id, &path("a.md"), "a", WriteOptions::default())
        .await
        .unwrap();
    let first = manager.get_tree(&id, true).await.unwrap();
    let first_names = first
        .root
        .unwrap()
        .children
        .unwrap()
        .into_iter()
        .map(|node| node.path.to_string())
        .collect::<Vec<_>>();
    assert!(
        first_names.iter().position(|name| name == "a.md")
            < first_names.iter().position(|name| name == "z.md")
    );
    assert!(!first_names.iter().any(|name| name.starts_with(".lonanote")));

    let mut settings = manager.get_settings(&id).await.unwrap();
    settings.file_tree_sort_type = FileTreeSortType::NameRev;
    settings.custom_ignore.push_str("\nignored.md\n");
    manager.set_settings(&id, settings).await.unwrap();
    manager
        .write_text(&id, &path("ignored.md"), "ignored", WriteOptions::default())
        .await
        .unwrap();
    manager.refresh_index(&id).await.unwrap();

    let tree = manager.get_tree(&id, true).await.unwrap();
    assert_eq!(tree.sort_type, FileTreeSortType::NameRev);
    let names = tree
        .root
        .unwrap()
        .children
        .unwrap()
        .into_iter()
        .map(|node| node.path.to_string())
        .collect::<Vec<_>>();
    assert!(
        names.iter().position(|name| name == "z.md") < names.iter().position(|name| name == "a.md")
    );
    assert!(!names.iter().any(|name| name == "ignored.md"));

    let node = manager.get_node(&id, &path("assets"), true).await.unwrap();
    assert_eq!(node.path.as_str(), "assets");
}

#[tokio::test]
async fn rejects_index_without_native_path() {
    let storage: Arc<dyn WorkspaceStorage> = Arc::new(MemoryStorage::new());
    let session = Arc::new(WorkspaceStorageSession::new(storage));
    let id = WorkspaceId::new();
    let instance = WorkspaceInstance::new(
        external_binding("/virtual/workspace"),
        session,
        WorkspaceManifest::new(id, "Memory".into(), 1),
    )
    .await
    .unwrap();

    assert!(matches!(
        instance.get_tree(true).await.unwrap_err(),
        WorkspaceError::FileTreeUnavailable
    ));
}

#[test]
fn default_index_ignores_metadata() {
    let settings = WorkspaceSettings::default();
    assert!(settings
        .custom_ignore
        .lines()
        .any(|line| line == ".lonanote"));
}

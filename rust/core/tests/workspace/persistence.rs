use std::{collections::HashSet, sync::Arc};

use crate::support::test_record;
use lonanote_core::workspace::{
    WorkspaceCatalog, WorkspaceError, WorkspaceId, WorkspaceSessionStore,
};
use serde_json::json;
use tempfile::TempDir;
use tokio::sync::Barrier;

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn catalog_concurrent_writes() {
    let temp = TempDir::new().unwrap();
    let catalog_path = temp.path().join("workspace-catalog.json");
    let catalog = Arc::new(WorkspaceCatalog::load(&catalog_path).await.unwrap());
    let first = test_record("A", temp.path().join("a"));
    let second = test_record("B", temp.path().join("b"));
    let ids = [first.id, second.id];
    let barrier = Arc::new(Barrier::new(3));

    let tasks = [first, second].map(|record| {
        let catalog = Arc::clone(&catalog);
        let barrier = Arc::clone(&barrier);
        tokio::spawn(async move {
            barrier.wait().await;
            catalog.add(record).await
        })
    });
    barrier.wait().await;
    for task in tasks {
        task.await.unwrap().unwrap();
    }

    let loaded = WorkspaceCatalog::load(&catalog_path).await.unwrap();
    assert_eq!(loaded.list().await.len(), 2);
    for id in ids {
        assert_eq!(loaded.get(&id).await.unwrap().id, id);
    }
    assert!(catalog_path.with_extension("json.bak").exists());
}

#[tokio::test]
async fn catalog_backup_recovery() {
    let temp = TempDir::new().unwrap();
    let catalog_path = temp.path().join("workspace-catalog.json");
    let catalog = WorkspaceCatalog::load(&catalog_path).await.unwrap();
    catalog
        .add(test_record("A", temp.path().join("a")))
        .await
        .unwrap();
    catalog
        .add(test_record("B", temp.path().join("b")))
        .await
        .unwrap();

    std::fs::write(&catalog_path, b"{corrupt").unwrap();
    assert!(!WorkspaceCatalog::load(&catalog_path)
        .await
        .unwrap()
        .list()
        .await
        .is_empty());

    std::fs::remove_file(&catalog_path).unwrap();
    assert!(!WorkspaceCatalog::load(&catalog_path)
        .await
        .unwrap()
        .list()
        .await
        .is_empty());
}

#[tokio::test]
async fn session_reconciliation() {
    let temp = TempDir::new().unwrap();
    let session_path = temp.path().join("workspace-session.json");
    let session = WorkspaceSessionStore::load(&session_path).await.unwrap();
    let kept = WorkspaceId::new();
    let stale = WorkspaceId::new();

    session.mark_opened(stale).await.unwrap();
    session.reconcile(&HashSet::from([kept])).await.unwrap();
    assert_eq!(session.last_workspace_id().await, None);

    session.mark_opened(kept).await.unwrap();
    let loaded = WorkspaceSessionStore::load(&session_path).await.unwrap();
    assert_eq!(loaded.last_workspace_id().await, Some(kept));
}

#[tokio::test]
async fn rejects_unknown_schema() {
    let temp = TempDir::new().unwrap();
    let catalog_path = temp.path().join("unsupported-catalog.json");
    std::fs::write(
        &catalog_path,
        serde_json::to_vec_pretty(&json!({"schemaVersion": 999, "workspaces": {}})).unwrap(),
    )
    .unwrap();
    assert!(matches!(
        WorkspaceCatalog::load(&catalog_path).await.unwrap_err(),
        WorkspaceError::Catalog(_)
    ));

    let session_path = temp.path().join("unsupported-session.json");
    std::fs::write(
        &session_path,
        serde_json::to_vec_pretty(&json!({
            "schemaVersion": 999,
            "lastWorkspaceId": null
        }))
        .unwrap(),
    )
    .unwrap();
    assert!(matches!(
        WorkspaceSessionStore::load(&session_path)
            .await
            .unwrap_err(),
        WorkspaceError::Session(_)
    ));
}

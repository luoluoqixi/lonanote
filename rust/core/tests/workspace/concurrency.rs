use std::sync::Arc;

use crate::support::{external_binding, path, ControlledStorage};
use lonanote_core::workspace::{
    WorkspaceId, WorkspaceInstance, WorkspaceManifest, WorkspaceRuntime, WorkspaceStorage,
    WorkspaceStorageSession, WriteOptions,
};

async fn instance(storage: Arc<ControlledStorage>, name: &str) -> Arc<WorkspaceInstance> {
    let id = WorkspaceId::new();
    let storage: Arc<dyn WorkspaceStorage> = storage;
    Arc::new(
        WorkspaceInstance::new(
            external_binding("/virtual/workspace"),
            Arc::new(WorkspaceStorageSession::new(storage)),
            WorkspaceManifest::new(id, name.into(), 1),
        )
        .await
        .unwrap(),
    )
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn serializes_same_instance() {
    let storage = Arc::new(ControlledStorage::paused());
    let workspace = instance(Arc::clone(&storage), "Serialized").await;
    let note = path("note.md");

    let first = {
        let workspace = Arc::clone(&workspace);
        let note = note.clone();
        tokio::spawn(async move {
            workspace
                .write_text(&note, "first", WriteOptions::default())
                .await
        })
    };
    storage.wait_until_first_write_enters().await;
    let second = {
        let workspace = Arc::clone(&workspace);
        let note = note.clone();
        tokio::spawn(async move {
            workspace
                .write_text(&note, "second", WriteOptions::default())
                .await
        })
    };

    for _ in 0..10 {
        tokio::task::yield_now().await;
    }
    assert_eq!(
        storage.entered(),
        1,
        "第二次写入应停在 instance mutation lock"
    );
    storage.release_first_write();
    first.await.unwrap().unwrap();
    second.await.unwrap().unwrap();
    assert_eq!(storage.entered(), 2);
    assert_eq!(workspace.read_text(&note).await.unwrap(), "second");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn keeps_instances_independent() {
    let blocked_storage = Arc::new(ControlledStorage::paused());
    let active_storage = Arc::new(ControlledStorage::active());
    let blocked = instance(Arc::clone(&blocked_storage), "Blocked").await;
    let active = instance(active_storage, "Active").await;
    let note = path("note.md");

    let blocked_write = {
        let blocked = Arc::clone(&blocked);
        let note = note.clone();
        tokio::spawn(async move {
            blocked
                .write_text(&note, "blocked", WriteOptions::default())
                .await
        })
    };
    blocked_storage.wait_until_first_write_enters().await;
    active
        .write_text(&note, "independent", WriteOptions::default())
        .await
        .unwrap();
    assert_eq!(active.read_text(&note).await.unwrap(), "independent");

    blocked_storage.release_first_write();
    blocked_write.await.unwrap().unwrap();
}

#[tokio::test]
async fn cloned_instance_outlives_runtime_entry() {
    let workspace = instance(Arc::new(ControlledStorage::active()), "Runtime").await;
    let runtime = WorkspaceRuntime::new();
    let id = workspace.id;
    runtime.insert(id, Arc::clone(&workspace)).await.unwrap();

    let cloned = runtime.get(&id).await.unwrap();
    runtime.remove(&id).await;
    assert!(!runtime.contains(&id).await);
    cloned
        .write_text(
            &path("after-close.md"),
            "still alive",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    assert_eq!(
        cloned.read_text(&path("after-close.md")).await.unwrap(),
        "still alive"
    );
}

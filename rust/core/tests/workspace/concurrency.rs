use std::sync::Arc;

use crate::support::{path, resolved_external_binding, ControlledStorage};
use async_trait::async_trait;
use lonanote_core::workspace::{
    save_local_setting, save_manifest, save_workspace_settings, StorageError, StorageProviderId,
    StorageResourceIdentity, WorkspaceCachedSummary, WorkspaceCatalog, WorkspaceDirectoryName,
    WorkspaceId, WorkspaceInstance, WorkspaceLocalSetting, WorkspaceManager, WorkspaceManifest,
    WorkspaceRecord, WorkspaceRuntime, WorkspaceSessionStore, WorkspaceSettings, WorkspaceStorage,
    WorkspaceStorageBinding, WorkspaceStorageBindingRequest, WorkspaceStorageResolver,
    WorkspaceStorageSession, WriteOptions,
};
use tempfile::TempDir;

async fn instance(storage: Arc<ControlledStorage>, name: &str) -> Arc<WorkspaceInstance> {
    let id = WorkspaceId::new();
    let storage: Arc<dyn WorkspaceStorage> = storage;
    Arc::new(
        WorkspaceInstance::new(
            resolved_external_binding("/virtual/workspace"),
            Arc::new(WorkspaceStorageSession::new(storage)),
            WorkspaceManifest::new(id, name.into(), 1),
            WorkspaceSettings::default(),
            WorkspaceLocalSetting::default(),
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

#[derive(Debug)]
struct SingleStorageResolver {
    session: Arc<WorkspaceStorageSession>,
}

#[async_trait]
impl WorkspaceStorageResolver for SingleStorageResolver {
    fn provider_ids(&self) -> Vec<StorageProviderId> {
        Vec::new()
    }

    fn managed_provider_ids(&self) -> Vec<StorageProviderId> {
        Vec::new()
    }

    async fn resolve_identity(
        &self,
        _binding: &WorkspaceStorageBindingRequest,
    ) -> Result<StorageResourceIdentity, StorageError> {
        Ok(StorageResourceIdentity::parse("test:single-storage").unwrap())
    }

    async fn open(
        &self,
        _binding: &WorkspaceStorageBinding,
    ) -> Result<Arc<WorkspaceStorageSession>, StorageError> {
        Ok(Arc::clone(&self.session))
    }

    async fn create_managed(
        &self,
        _provider_id: &StorageProviderId,
        _directory_name: &WorkspaceDirectoryName,
    ) -> Result<(WorkspaceStorageBinding, Arc<WorkspaceStorageSession>), StorageError> {
        Err(StorageError::UnsupportedOperation {
            operation: "create_managed",
        })
    }

    async fn remove_workspace_root(
        &self,
        _binding: &WorkspaceStorageBinding,
    ) -> Result<(), StorageError> {
        Ok(())
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn close_waits_for_active_operation() {
    let temp = TempDir::new().unwrap();
    let storage = Arc::new(ControlledStorage::active());
    let erased: Arc<dyn WorkspaceStorage> = storage.clone();
    let storage_session = Arc::new(WorkspaceStorageSession::new(erased));
    let id = WorkspaceId::new();
    let binding = resolved_external_binding("/virtual/workspace");
    let manifest = WorkspaceManifest::new(id, "Draining".into(), 1);
    save_workspace_settings(storage_session.as_ref(), &WorkspaceSettings::default())
        .await
        .unwrap();
    save_local_setting(storage_session.as_ref(), &WorkspaceLocalSetting::default())
        .await
        .unwrap();
    save_manifest(storage_session.as_ref(), &manifest)
        .await
        .unwrap();

    let catalog = WorkspaceCatalog::load(temp.path().join("workspace-catalog.json"))
        .await
        .unwrap();
    catalog
        .add(WorkspaceRecord {
            id,
            storage_binding: binding,
            cached_summary: WorkspaceCachedSummary {
                display_name: "Draining".into(),
                created_at: Some(1),
                last_opened_at: None,
                last_validated_at: Some(1),
            },
        })
        .await
        .unwrap();
    let app_session = WorkspaceSessionStore::load(temp.path().join("workspace-session.json"))
        .await
        .unwrap();
    let resolver: Arc<dyn WorkspaceStorageResolver> = Arc::new(SingleStorageResolver {
        session: storage_session,
    });
    let manager = Arc::new(WorkspaceManager::new(catalog, app_session, resolver));
    manager.open_workspace(&id).await.unwrap();
    storage.pause_next_write();

    let write = {
        let manager = Arc::clone(&manager);
        tokio::spawn(async move {
            manager
                .write_text(
                    &id,
                    &path("note.md"),
                    "finished before close",
                    WriteOptions::default(),
                )
                .await
        })
    };
    storage.wait_until_first_write_enters().await;
    let close = {
        let manager = Arc::clone(&manager);
        tokio::spawn(async move { manager.close_workspace(&id).await })
    };
    for _ in 0..10 {
        tokio::task::yield_now().await;
    }
    assert!(
        !close.is_finished(),
        "close 应等待已经开始的 Workspace 操作"
    );

    storage.release_first_write();
    write.await.unwrap().unwrap();
    close.await.unwrap().unwrap();
    assert!(!manager.is_workspace_open(&id).await);
}

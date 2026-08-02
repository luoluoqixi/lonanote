use std::sync::Arc;

use crate::support::{
    external_binding, path, provider, WorkspaceTestApp, EXTERNAL_PROVIDER, MANAGED_PROVIDER,
};
use lonanote_core::workspace::{
    StorageCleanupStatus, WorkspaceError, WorkspaceId, WorkspaceManifest,
    INITIAL_WORKSPACE_DISPLAY_NAME_EN,
};
use tokio::sync::Barrier;

#[tokio::test]
async fn lists_storage_providers() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;

    let provider_ids = manager
        .storage_provider_ids()
        .into_iter()
        .map(|provider_id| provider_id.to_string())
        .collect::<Vec<_>>();

    assert_eq!(provider_ids, [MANAGED_PROVIDER, EXTERNAL_PROVIDER]);
}

#[tokio::test]
async fn managed_restart_flow() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "个人笔记".into())
        .await
        .unwrap();
    let id = created.id;
    let root = app.managed_workspace_root(&created);

    assert!(manager.is_workspace_open(&id).await);
    assert_eq!(app.read_manifest(&created).id, id);
    assert!(root.join(".lonanote/settings.json").exists());
    assert!(root.join(".lonanote/settings.local.json").exists());
    assert_eq!(
        std::fs::read_to_string(root.join(".lonanote/.gitignore")).unwrap(),
        "settings.local.json\n"
    );
    assert!(!root.join("README.md").exists());
    assert!(!root.join("README_en.md").exists());
    assert!(!root.join("assets/images/icon.png").exists());
    assert_eq!(manager.get_last_workspace_id().await, Some(id));

    manager
        .set_last_open_file(&id, Some(path("notes.md")))
        .await
        .unwrap();
    let mut settings = manager.get_settings(&id).await.unwrap();
    settings.history_snapshot_count = 31;
    manager.set_settings(&id, settings).await.unwrap();
    manager.close_workspace(&id).await.unwrap();
    drop(manager);

    let restarted = app.start().await;
    assert!(!restarted.is_workspace_open(&id).await);
    let listed = restarted.list_workspaces().await;
    assert_eq!(listed[0].id, id);
    assert!(listed[0].last_opened_at.is_some());
    restarted.open_workspace(&id).await.unwrap();
    assert_eq!(
        restarted
            .get_settings(&id)
            .await
            .unwrap()
            .history_snapshot_count,
        31
    );
    assert_eq!(
        restarted
            .get_local_setting(&id)
            .await
            .unwrap()
            .last_open_file
            .unwrap(),
        path("notes.md")
    );
    assert!(app.data_dir.join("workspace-session.json").exists());
    assert!(!app.data_dir.join("workspace-local-state.json").exists());
}

#[tokio::test]
async fn initial_workspace_is_copied_once_even_after_deletion() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;

    let created = manager
        .create_initial_workspace_if_needed(provider(MANAGED_PROVIDER))
        .await
        .unwrap()
        .expect("首次启动必须创建默认 Workspace");
    let root = app.managed_workspace_root(&created);

    assert_eq!(created.display_name, INITIAL_WORKSPACE_DISPLAY_NAME_EN);
    assert!(root.join("README.md").exists());
    assert!(root.join("README_en.md").exists());
    assert!(root.join("assets/images/icon.png").exists());
    let catalog: serde_json::Value = serde_json::from_slice(
        &std::fs::read(app.data_dir.join("workspace-catalog.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(catalog["initialWorkspaceCopied"], true);
    assert_eq!(catalog["initialWorkspaceId"], created.id.to_string());

    manager.close_workspace(&created.id).await.unwrap();
    manager.remove_workspace(&created.id, true).await.unwrap();
    assert!(manager.list_workspaces().await.is_empty());
    assert!(manager
        .create_initial_workspace_if_needed(provider(MANAGED_PROVIDER))
        .await
        .unwrap()
        .is_none());

    drop(manager);
    let restarted = app.start().await;
    assert!(restarted
        .create_initial_workspace_if_needed(provider(MANAGED_PROVIDER))
        .await
        .unwrap()
        .is_none());
    assert!(restarted.list_workspaces().await.is_empty());
}

#[tokio::test]
async fn initial_workspace_uses_fallback_locale_when_platform_does_not_initialize_it() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;

    let created = manager
        .create_initial_workspace_if_needed(provider(MANAGED_PROVIDER))
        .await
        .unwrap()
        .expect("首次启动必须创建默认 Workspace");

    assert_eq!(created.display_name, INITIAL_WORKSPACE_DISPLAY_NAME_EN);
}

#[tokio::test]
async fn gm_reset_initial_workspace_removes_seed_and_allows_recreation() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let initial = manager
        .create_initial_workspace_if_needed(provider(MANAGED_PROVIDER))
        .await
        .unwrap()
        .expect("首次启动必须创建默认 Workspace");
    let initial_root = app.managed_workspace_root(&initial);

    let removed = manager
        .gm_reset_initial_workspace()
        .await
        .unwrap()
        .expect("GM 重置必须删除首次默认 Workspace");
    assert_eq!(removed.workspace_id, initial.id);
    assert_eq!(removed.file_cleanup, StorageCleanupStatus::Removed);
    assert!(!initial_root.exists());
    assert!(manager.list_workspaces().await.is_empty());
    let catalog: serde_json::Value = serde_json::from_slice(
        &std::fs::read(app.data_dir.join("workspace-catalog.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(catalog["initialWorkspaceCopied"], false);
    assert!(catalog.get("initialWorkspaceId").is_none());

    let recreated = manager
        .create_initial_workspace_if_needed(provider(MANAGED_PROVIDER))
        .await
        .unwrap()
        .expect("GM 重置后必须允许再次创建默认 Workspace");
    assert_eq!(recreated.display_name, INITIAL_WORKSPACE_DISPLAY_NAME_EN);
}

#[tokio::test]
async fn recreates_missing_local_setting() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Local Setting".into())
        .await
        .unwrap();
    let local_path = app
        .managed_workspace_root(&created)
        .join(".lonanote/settings.local.json");
    manager.close_workspace(&created.id).await.unwrap();
    std::fs::remove_file(&local_path).unwrap();

    manager.open_workspace(&created.id).await.unwrap();

    let setting = manager.get_local_setting(&created.id).await.unwrap();
    assert!(setting.last_opened_at.is_some());
    assert_eq!(setting.last_open_file, None);
    assert!(local_path.exists());
}

#[tokio::test]
async fn manifest_marks_completed_initialization() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let root = app.external_dir("retry-initialization");
    let blocked_local_setting = root.join(".lonanote/settings.local.json");
    std::fs::create_dir_all(&blocked_local_setting).unwrap();

    assert!(manager
        .create_external_workspace(external_binding(&root), "Retry".into())
        .await
        .is_err());
    assert!(!root.join(".lonanote/manifest.json").exists());

    std::fs::remove_dir(&blocked_local_setting).unwrap();
    let created = manager
        .create_external_workspace(external_binding(&root), "Retry".into())
        .await
        .unwrap();
    assert!(root.join(".lonanote/manifest.json").exists());
    assert_eq!(created.display_name, "Retry");
}

#[tokio::test]
async fn resolves_name_collision() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let first = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Notes".into())
        .await
        .unwrap();
    let second = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Notes".into())
        .await
        .unwrap();

    assert_eq!(first.storage.directory_name.unwrap().as_str(), "Notes");
    assert_eq!(second.storage.directory_name.unwrap().as_str(), "Notes-2");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn concurrent_open_is_idempotent() {
    let app = WorkspaceTestApp::new();
    let manager = Arc::new(app.start().await);
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Concurrent Open".into())
        .await
        .unwrap();
    let id = created.id;
    manager.close_workspace(&id).await.unwrap();
    let barrier = Arc::new(Barrier::new(3));

    let tasks = [(), ()].map(|()| {
        let manager = Arc::clone(&manager);
        let barrier = Arc::clone(&barrier);
        tokio::spawn(async move {
            barrier.wait().await;
            manager.open_workspace(&id).await
        })
    });
    barrier.wait().await;
    for task in tasks {
        assert_eq!(task.await.unwrap().unwrap().id, id);
    }
    assert!(manager.is_workspace_open(&id).await);
}

#[tokio::test]
async fn external_attach_flow() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let root = app.external_dir("external-notes");
    std::fs::write(root.join("existing.txt"), "keep").unwrap();

    let created = manager
        .create_external_workspace(external_binding(&root), "外部笔记".into())
        .await
        .unwrap();
    assert_eq!(
        std::fs::read_to_string(root.join("existing.txt")).unwrap(),
        "keep"
    );
    manager.close_workspace(&created.id).await.unwrap();
    let removed = manager.remove_workspace(&created.id, false).await.unwrap();
    assert_eq!(removed.file_cleanup, StorageCleanupStatus::Retained);
    assert!(root.exists());

    assert_eq!(
        manager
            .attach_workspace(external_binding(&root))
            .await
            .unwrap()
            .id,
        created.id
    );
    assert_eq!(
        manager
            .attach_workspace(external_binding(&root))
            .await
            .unwrap()
            .id,
        created.id
    );
}

#[tokio::test]
async fn reattaches_same_external_resource_through_alias() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let root = app.external_dir("external-alias");
    let created = manager
        .create_external_workspace(external_binding(&root), "Alias".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let alias = root.join("..").join("external-alias");

    let attached = manager
        .attach_workspace(external_binding(alias))
        .await
        .unwrap();

    assert_eq!(attached.id, created.id);
}

#[tokio::test]
async fn rejects_copied_workspace_with_same_manifest_id() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let root = app.external_dir("external-original");
    let copy = app.external_dir("external-copy");
    let created = manager
        .create_external_workspace(external_binding(&root), "Original".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    std::fs::create_dir_all(copy.join(".lonanote")).unwrap();
    for file_name in ["manifest.json", "settings.json"] {
        std::fs::copy(
            root.join(".lonanote").join(file_name),
            copy.join(".lonanote").join(file_name),
        )
        .unwrap();
    }

    assert!(matches!(
        manager
            .attach_workspace(external_binding(copy))
            .await
            .unwrap_err(),
        WorkspaceError::DuplicateWorkspaceId(id) if id == created.id
    ));
}

#[tokio::test]
async fn retries_failed_open() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let root = app.external_dir("mismatch");
    let created = manager
        .create_external_workspace(external_binding(&root), "Mismatch".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();

    let manifest_path = root.join(".lonanote/manifest.json");
    let original = std::fs::read(&manifest_path).unwrap();
    let mut manifest: WorkspaceManifest = serde_json::from_slice(&original).unwrap();
    manifest.id = WorkspaceId::new();
    std::fs::write(
        &manifest_path,
        serde_json::to_vec_pretty(&manifest).unwrap(),
    )
    .unwrap();

    assert!(matches!(
        manager.open_workspace(&created.id).await.unwrap_err(),
        WorkspaceError::WorkspaceIdMismatch { expected, .. } if expected == created.id
    ));
    assert!(!manager.is_workspace_open(&created.id).await);
    assert!(manager
        .list_workspaces()
        .await
        .iter()
        .any(|item| item.id == created.id));

    std::fs::write(&manifest_path, original).unwrap();
    assert_eq!(
        manager.open_workspace(&created.id).await.unwrap().id,
        created.id
    );
}

#[tokio::test]
async fn ignores_v1_files() {
    let app = WorkspaceTestApp::new();
    let legacy_id = WorkspaceId::new();
    std::fs::write(
        app.data_dir.join("workspaces.json"),
        format!(r#"{{"saveData":{{}},"workspaces":["{legacy_id}"]}}"#),
    )
    .unwrap();
    let external = app.external_dir("legacy-external");
    std::fs::create_dir_all(external.join(".lonanote")).unwrap();
    std::fs::write(
        external.join(".lonanote/workspace.json"),
        "{\"legacy\":true}",
    )
    .unwrap();

    let manager = app.start().await;
    assert!(manager.list_workspaces().await.is_empty());
    let created = manager
        .create_external_workspace(external_binding(&external), "New".into())
        .await
        .unwrap();
    assert_ne!(created.id, legacy_id);
    assert!(external.join(".lonanote/workspace.json").exists());
    assert!(external.join(".lonanote/manifest.json").exists());
}

#[tokio::test]
async fn reports_cleanup_failure() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Disposable".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    std::fs::remove_dir_all(app.managed_workspace_root(&created)).unwrap();

    let result = manager.remove_workspace(&created.id, true).await.unwrap();
    assert!(matches!(
        result.file_cleanup,
        StorageCleanupStatus::Failed { .. }
    ));
    assert!(!manager
        .list_workspaces()
        .await
        .iter()
        .any(|workspace| workspace.id == created.id));
    assert_eq!(manager.get_last_workspace_id().await, None);
}

use crate::support::{path, provider, WorkspaceTestApp, MANAGED_PROVIDER};
use lonanote_core::workspace::{WorkspaceCatalog, WorkspaceError, WorkspaceSnapshot, WriteOptions};
use serde_json::{json, Value};

fn state_path(app: &WorkspaceTestApp, workspace: &WorkspaceSnapshot) -> std::path::PathBuf {
    app.managed_workspace_root(workspace)
        .join(".lonanote/state.json")
}

fn write_state(app: &WorkspaceTestApp, workspace: &WorkspaceSnapshot, value: Value) {
    std::fs::write(
        state_path(app, workspace),
        serde_json::to_vec(&value).unwrap(),
    )
    .unwrap();
}

fn read_state(app: &WorkspaceTestApp, workspace: &WorkspaceSnapshot) -> Value {
    serde_json::from_slice(&std::fs::read(state_path(app, workspace)).unwrap()).unwrap()
}

async fn cached_time(app: &WorkspaceTestApp, workspace: &WorkspaceSnapshot) -> Option<u64> {
    WorkspaceCatalog::load(app.data_dir.join("workspace-catalog.json"))
        .await
        .unwrap()
        .get(&workspace.id)
        .await
        .unwrap()
        .cached_summary
        .modified_at
}

#[tokio::test]
async fn create_initializes_syncable_state_and_keeps_created_time_in_manifest() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "State".into())
        .await
        .unwrap();
    let state = read_state(&app, &created);
    assert_eq!(state["schemaVersion"], 1);
    assert_eq!(state["modifiedAt"], app.read_manifest(&created).created_at);
    assert!(state.get("createdAt").is_none());
    assert_eq!(
        std::fs::read_to_string(
            app.managed_workspace_root(&created)
                .join(".lonanote/.gitignore")
        )
        .unwrap(),
        "settings.local.json\n"
    );
    let status = manager.get_state(&created.id).await.unwrap();
    assert!(!status.save_pending);
    assert!(status.last_save_error.is_none());
}

#[tokio::test]
async fn opening_state_overrides_newer_catalog_including_unknown_time() {
    for time in [json!(1), Value::Null] {
        let app = WorkspaceTestApp::new();
        let manager = app.start().await;
        let created = manager
            .create_managed_workspace(provider(MANAGED_PROVIDER), "Authority".into())
            .await
            .unwrap();
        drop(manager);
        write_state(
            &app,
            &created,
            json!({"schemaVersion": 1, "modifiedAt": time, "futureState": {"value": 7}}),
        );
        let original = std::fs::read(state_path(&app, &created)).unwrap();
        let manager = app.start().await;
        manager.open_workspace(&created.id).await.unwrap();
        assert_eq!(cached_time(&app, &created).await, time.as_u64());
        assert_eq!(
            manager.list_workspaces().await[0].modified_at,
            time.as_u64()
        );
        assert_eq!(
            std::fs::read(state_path(&app, &created)).unwrap(),
            original,
            "打开不重写已有 State"
        );
        manager.close_workspace(&created.id).await.unwrap();
        drop(manager);
        let restarted = app.start().await;
        assert_eq!(
            restarted.list_workspaces().await[0].modified_at,
            time.as_u64(),
            "未打开列表也不能为 null State 使用文件夹兜底"
        );
    }
}

#[tokio::test]
async fn missing_state_is_initialized_from_legacy_catalog_without_marking_modified() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Legacy State".into())
        .await
        .unwrap();
    drop(manager);
    std::fs::remove_file(state_path(&app, &created)).unwrap();
    let catalog = WorkspaceCatalog::load(app.data_dir.join("workspace-catalog.json"))
        .await
        .unwrap();
    let mut summary = catalog.get(&created.id).await.unwrap().cached_summary;
    summary.modified_at = Some(77);
    catalog.update_summary(&created.id, summary).await.unwrap();
    let manager = app.start().await;
    manager.open_workspace(&created.id).await.unwrap();
    assert_eq!(read_state(&app, &created)["modifiedAt"], 77);
    assert_eq!(cached_time(&app, &created).await, Some(77));
}

#[tokio::test]
async fn reload_applies_external_changes_and_preserves_unknown_fields_on_save() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Reload State".into())
        .await
        .unwrap();
    write_state(
        &app,
        &created,
        json!({"schemaVersion": 1, "modifiedAt": 1, "futureState": {"nested": [1, 2]}}),
    );
    let status = manager.reload_state(&created.id).await.unwrap();
    assert_eq!(status.state.modified_at, Some(1));
    assert_eq!(cached_time(&app, &created).await, Some(1));
    manager
        .write_text(
            &created.id,
            &path("nested/note.md"),
            "saved",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    let state = read_state(&app, &created);
    assert!(state["modifiedAt"].as_u64().unwrap() > 1);
    assert_eq!(state["futureState"], json!({"nested": [1, 2]}));
    write_state(
        &app,
        &created,
        json!({"schemaVersion": 1, "modifiedAt": null}),
    );
    // 重复 open 也会刷新已打开实例，而不是继续返回旧缓存。
    manager.open_workspace(&created.id).await.unwrap();
    assert_eq!(
        manager
            .get_state(&created.id)
            .await
            .unwrap()
            .state
            .modified_at,
        None
    );
    assert_eq!(cached_time(&app, &created).await, None);
}

#[tokio::test]
async fn invalid_state_is_not_replaced_and_failed_reload_preserves_memory() {
    for bytes in [
        "{broken",
        r#"{"schemaVersion":999,"modifiedAt":1}"#,
        r#"{"modifiedAt":1}"#,
        r#"{"schemaVersion":1,"modifiedAt":-1}"#,
    ] {
        let app = WorkspaceTestApp::new();
        let manager = app.start().await;
        let created = manager
            .create_managed_workspace(provider(MANAGED_PROVIDER), "Invalid State".into())
            .await
            .unwrap();
        let before = manager.get_state(&created.id).await.unwrap();
        std::fs::write(state_path(&app, &created), bytes).unwrap();
        assert!(matches!(
            manager.reload_state(&created.id).await.unwrap_err(),
            WorkspaceError::InvalidState(_)
        ));
        assert_eq!(manager.get_state(&created.id).await.unwrap(), before);
        manager.close_workspace(&created.id).await.unwrap();
        assert!(matches!(
            manager.open_workspace(&created.id).await.unwrap_err(),
            WorkspaceError::InvalidState(_)
        ));
        assert!(!manager.is_workspace_open(&created.id).await);
        assert_eq!(
            std::fs::read_to_string(state_path(&app, &created)).unwrap(),
            bytes
        );
    }
}

#[tokio::test]
async fn state_write_failure_keeps_content_and_pending_state_until_retry() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Pending State".into())
        .await
        .unwrap();
    write_state(&app, &created, json!({"schemaVersion": 1, "modifiedAt": 1}));
    manager.reload_state(&created.id).await.unwrap();
    let blocked = state_path(&app, &created);
    std::fs::remove_file(&blocked).unwrap();
    std::fs::create_dir(&blocked).unwrap();
    manager
        .write_text(
            &created.id,
            &path("saved.md"),
            "content is saved",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    assert_eq!(
        manager
            .read_text(&created.id, &path("saved.md"))
            .await
            .unwrap(),
        "content is saved"
    );
    let pending = manager.get_state(&created.id).await.unwrap();
    assert!(pending.save_pending);
    assert!(pending.last_save_error.is_some());
    assert!(pending.state.modified_at.unwrap() > 1);
    assert_eq!(
        cached_time(&app, &created).await,
        Some(1),
        "未持久化的 State 不投影到 Catalog"
    );
    assert!(matches!(
        manager.reload_state(&created.id).await.unwrap_err(),
        WorkspaceError::StateSavePending(_)
    ));
    assert!(matches!(
        manager.close_workspace(&created.id).await.unwrap_err(),
        WorkspaceError::StateSavePending(_)
    ));
    assert!(
        manager.is_workspace_open(&created.id).await,
        "关闭失败不能丢弃待写状态"
    );
    std::fs::remove_dir(&blocked).unwrap();
    let saved = manager.flush_state(&created.id).await.unwrap();
    assert!(!saved.save_pending);
    assert!(saved.last_save_error.is_none());
    assert_eq!(saved.state.modified_at, pending.state.modified_at);
    assert_eq!(cached_time(&app, &created).await, saved.state.modified_at);
    manager.close_workspace(&created.id).await.unwrap();
    drop(manager);
    let restarted = app.start().await;
    restarted.open_workspace(&created.id).await.unwrap();
    assert_eq!(
        restarted.get_state(&created.id).await.unwrap().state,
        saved.state
    );
}

#[tokio::test]
async fn next_mutation_retries_pending_state_and_scan_recovers_authoritative_time() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Recover State".into())
        .await
        .unwrap();
    write_state(&app, &created, json!({"schemaVersion": 1, "modifiedAt": 1}));
    manager.reload_state(&created.id).await.unwrap();
    let blocked = state_path(&app, &created);
    std::fs::remove_file(&blocked).unwrap();
    std::fs::create_dir(&blocked).unwrap();
    manager
        .create_directory(&created.id, &path("notes"))
        .await
        .unwrap();
    assert!(manager.get_state(&created.id).await.unwrap().save_pending);
    std::fs::remove_dir(&blocked).unwrap();
    manager
        .write_text(
            &created.id,
            &path("notes/note.md"),
            "retry",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    assert!(!manager.get_state(&created.id).await.unwrap().save_pending);
    manager.close_workspace(&created.id).await.unwrap();
    manager.remove_workspace(&created.id, false).await.unwrap();
    write_state(
        &app,
        &created,
        json!({"schemaVersion": 1, "modifiedAt": 42}),
    );
    manager.scan_managed_workspaces().await.unwrap();
    assert_eq!(manager.list_workspaces().await[0].modified_at, Some(42));
    assert!(!manager.is_workspace_open(&created.id).await);
    manager.open_workspace(&created.id).await.unwrap();
    assert_eq!(
        manager
            .get_state(&created.id)
            .await
            .unwrap()
            .state
            .modified_at,
        Some(42)
    );
}

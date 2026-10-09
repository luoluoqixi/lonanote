use crate::support::{
    external_binding, path, provider, test_record, WorkspaceTestApp, MANAGED_PROVIDER,
};
use lonanote_core::workspace::{
    save_workspace_state, WorkspaceCatalog, WorkspaceId, WorkspaceManager, WorkspaceState,
    WorkspaceStorageResolver, WriteOptions,
};

async fn seed_modified_at(app: &WorkspaceTestApp, id: WorkspaceId, timestamp: u64) {
    let catalog = WorkspaceCatalog::load(app.data_dir.join("workspace-catalog.json"))
        .await
        .unwrap();
    let record = catalog.get(&id).await.unwrap();
    let session = app.resolver.open(&record.storage_binding).await.unwrap();
    save_workspace_state(
        session.as_ref(),
        &WorkspaceState {
            modified_at: Some(timestamp),
            ..WorkspaceState::default()
        },
    )
    .await
    .unwrap();
    let mut summary = record.cached_summary;
    summary.modified_at = Some(timestamp);
    catalog.update_summary(&id, summary).await.unwrap();
}

async fn modified_at(manager: &WorkspaceManager, id: WorkspaceId) -> Option<u64> {
    manager
        .list_workspaces()
        .await
        .into_iter()
        .find(|item| item.id == id)
        .unwrap()
        .modified_at
}

#[tokio::test]
async fn successful_mutations_cache_modified_at_across_restart() {
    // 每种修改从旧时间开始，避免同一秒内操作掩盖漏记的修改入口。
    for operation in 0..7 {
        let app = WorkspaceTestApp::new();
        let manager = app.start().await;
        let created = manager
            .create_managed_workspace(provider(MANAGED_PROVIDER), "Modified".into())
            .await
            .unwrap();
        let root = app.managed_workspace_root(&created);
        std::fs::write(root.join("note.md"), "old").unwrap();
        drop(manager);
        seed_modified_at(&app, created.id, 1).await;
        let manager = app.start().await;
        manager.open_workspace(&created.id).await.unwrap();
        assert_eq!(modified_at(&manager, created.id).await, Some(1));

        match operation {
            0 => manager
                .write_text(
                    &created.id,
                    &path("note.md"),
                    "new",
                    WriteOptions::default(),
                )
                .await
                .unwrap(),
            1 => manager
                .write_bytes(
                    &created.id,
                    &path("note.md"),
                    b"bytes",
                    WriteOptions::default(),
                )
                .await
                .unwrap(),
            2 => manager
                .create_directory(&created.id, &path("nested/dir"))
                .await
                .unwrap(),
            3 => manager
                .rename(&created.id, &path("note.md"), &path("renamed.md"))
                .await
                .unwrap(),
            4 => manager
                .remove(&created.id, &path("note.md"), false)
                .await
                .unwrap(),
            5 => {
                manager
                    .update_display_name(&created.id, "Renamed".into())
                    .await
                    .unwrap();
            }
            6 => {
                let mut settings = manager.get_settings(&created.id).await.unwrap();
                settings.history_snapshot_count += 1;
                manager.set_settings(&created.id, settings).await.unwrap();
            }
            _ => unreachable!(),
        }
        let timestamp = modified_at(&manager, created.id).await.unwrap();
        assert!(timestamp > 1, "修改入口 {operation} 必须更新缓存");
        let state = manager.get_state(&created.id).await.unwrap();
        assert_eq!(state.state.modified_at, Some(timestamp));
        assert!(!state.save_pending);
        let state_json: serde_json::Value =
            serde_json::from_slice(&std::fs::read(root.join(".lonanote/state.json")).unwrap())
                .unwrap();
        assert_eq!(state_json["modifiedAt"], timestamp);
        drop(manager);
        let restarted = app.start().await;
        assert_eq!(modified_at(&restarted, created.id).await, Some(timestamp));
        assert!(!restarted.is_workspace_open(&created.id).await);
    }
}

#[tokio::test]
async fn reads_open_and_failed_mutations_do_not_change_modified_at() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Read Only".into())
        .await
        .unwrap();
    drop(manager);
    seed_modified_at(&app, created.id, 1).await;
    let manager = app.start().await;
    manager.open_workspace(&created.id).await.unwrap();
    manager
        .read_text(&created.id, &path(".lonanote/manifest.json"))
        .await
        .unwrap();
    manager
        .set_last_open_file(&created.id, Some(path("note.md")))
        .await
        .unwrap();
    manager.refresh_index(&created.id).await.unwrap();
    assert!(manager
        .write_text(
            &created.id,
            &path(".lonanote/manifest.json"),
            "invalid",
            WriteOptions::default()
        )
        .await
        .is_err());
    assert!(manager
        .rename(&created.id, &path("missing.md"), &path("new.md"))
        .await
        .is_err());
    assert!(manager
        .remove(&created.id, &path("missing.md"), false)
        .await
        .is_err());
    manager.close_workspace(&created.id).await.unwrap();
    manager.open_workspace(&created.id).await.unwrap();
    assert_eq!(modified_at(&manager, created.id).await, Some(1));
}

#[tokio::test]
async fn restored_folder_uses_folder_time_and_caches_it_without_opening() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Restored".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    manager.remove_workspace(&created.id, false).await.unwrap();
    std::fs::remove_file(
        app.managed_workspace_root(&created)
            .join(".lonanote/state.json"),
    )
    .unwrap();
    manager.scan_managed_workspaces().await.unwrap();
    let expected = std::fs::metadata(app.managed_workspace_root(&created))
        .unwrap()
        .modified()
        .unwrap()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    assert_eq!(modified_at(&manager, created.id).await, Some(expected));
    assert!(!manager.is_workspace_open(&created.id).await);
    drop(manager);
    assert_eq!(
        modified_at(&app.start().await, created.id).await,
        Some(expected)
    );
}

#[tokio::test]
async fn old_catalog_with_missing_folder_keeps_unknown_modified_at() {
    let app = WorkspaceTestApp::new();
    let record = test_record("Missing", app.data_dir.join("missing"));
    let mut record_json = serde_json::to_value(&record).unwrap();
    record_json["cachedSummary"]
        .as_object_mut()
        .unwrap()
        .remove("modifiedAt");
    let data =
        serde_json::json!({"schemaVersion": 1, "workspaces": {record.id.to_string(): record_json}});
    std::fs::write(
        app.data_dir.join("workspace-catalog.json"),
        serde_json::to_vec(&data).unwrap(),
    )
    .unwrap();
    let manager = app.start().await;
    assert_eq!(modified_at(&manager, record.id).await, None);
    assert!(!manager.is_workspace_open(&record.id).await);
}

#[tokio::test]
async fn reattaching_same_folder_preserves_cached_times() {
    let app = WorkspaceTestApp::new();
    let root = app.external_dir("reattach");
    let manager = app.start().await;
    let created = manager
        .create_external_workspace(external_binding(&root), "External".into())
        .await
        .unwrap();
    drop(manager);
    seed_modified_at(&app, created.id, 1).await;
    let manager = app.start().await;
    let before = manager.list_workspaces().await[0].clone();
    manager
        .attach_workspace(external_binding(&root))
        .await
        .unwrap();
    let after = manager.list_workspaces().await[0].clone();
    assert_eq!(after.modified_at, Some(1));
    assert_eq!(after.last_opened_at, before.last_opened_at);
}

#[tokio::test]
async fn catalog_cache_failure_does_not_report_saved_content_as_failed() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Cache Failure".into())
        .await
        .unwrap();
    drop(manager);
    seed_modified_at(&app, created.id, 1).await;
    let manager = app.start().await;
    manager.open_workspace(&created.id).await.unwrap();
    let catalog_path = app.data_dir.join("workspace-catalog.json");
    std::fs::remove_file(&catalog_path).unwrap();
    std::fs::create_dir(&catalog_path).unwrap();
    manager
        .write_text(
            &created.id,
            &path("saved.md"),
            "saved",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    assert_eq!(
        manager
            .read_text(&created.id, &path("saved.md"))
            .await
            .unwrap(),
        "saved"
    );
}

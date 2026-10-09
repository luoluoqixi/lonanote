use std::collections::HashSet;

use lonanote_core::workspace::{WorkspaceError, WorkspaceId, WorkspaceManager, WorkspaceSnapshot};

use crate::support::{external_binding, provider, WorkspaceTestApp, MANAGED_PROVIDER};

async fn duplicate_group(
    app: &WorkspaceTestApp,
    manager: &WorkspaceManager,
    count: usize,
    registered: bool,
) -> Vec<WorkspaceSnapshot> {
    let first = manager
        .create_initial_workspace_if_needed(provider(MANAGED_PROVIDER))
        .await
        .unwrap()
        .unwrap();
    manager.close_workspace(&first.id).await.unwrap();
    let mut snapshots = vec![first];
    for index in 1..count {
        let snapshot = manager
            .create_managed_workspace(provider(MANAGED_PROVIDER), format!("Copy {index}"))
            .await
            .unwrap();
        manager.close_workspace(&snapshot.id).await.unwrap();
        manager.remove_workspace(&snapshot.id, false).await.unwrap();
        let mut manifest = app.read_manifest(&snapshot);
        manifest.id = snapshots[0].id;
        std::fs::write(
            app.managed_workspace_root(&snapshot)
                .join(".lonanote/manifest.json"),
            serde_json::to_vec_pretty(&manifest).unwrap(),
        )
        .unwrap();
        std::fs::write(
            app.managed_workspace_root(&snapshot).join("note.md"),
            format!("笔记 {index}"),
        )
        .unwrap();
        snapshots.push(snapshot);
    }
    if !registered {
        manager
            .remove_workspace(&snapshots[0].id, false)
            .await
            .unwrap();
    }
    snapshots
}

#[tokio::test]
async fn collects_ten_duplicates_before_registering_and_skip_changes_nothing() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let snapshots = duplicate_group(&app, &manager, 10, false).await;
    let catalog_before = std::fs::read(app.data_dir.join("workspace-catalog.json")).unwrap();
    let session_before = std::fs::read(app.data_dir.join("workspace-session.json")).unwrap();
    let scan = manager.scan_managed_workspaces().await.unwrap();
    assert_eq!(scan.registered_count, 0);
    assert_eq!(scan.id_conflicts.len(), 1);
    let group = &scan.id_conflicts[0];
    assert_eq!(group.candidates.len(), 10);
    assert!(group
        .candidates
        .iter()
        .all(|candidate| !candidate.is_registered));
    manager.discard_scan_id_conflict(&group.conflict_id).await;
    assert!(matches!(
        manager
            .resolve_scan_id_conflict(&group.conflict_id, 0)
            .await
            .unwrap_err(),
        WorkspaceError::ScanConflict(_)
    ));
    assert!(manager.list_workspaces().await.is_empty());
    assert_eq!(
        std::fs::read(app.data_dir.join("workspace-catalog.json")).unwrap(),
        catalog_before
    );
    assert_eq!(
        std::fs::read(app.data_dir.join("workspace-session.json")).unwrap(),
        session_before
    );
    for snapshot in &snapshots {
        assert_eq!(app.read_manifest(snapshot).id, snapshots[0].id);
    }
}

#[tokio::test]
async fn resolves_ten_unregistered_duplicates_and_survives_restart() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let snapshots = duplicate_group(&app, &manager, 10, false).await;
    let scan = manager.scan_managed_workspaces().await.unwrap();
    let group = &scan.id_conflicts[0];
    let keep = group
        .candidates
        .iter()
        .position(|candidate| candidate.display_name == "Copy 9")
        .unwrap();
    let result = manager
        .resolve_scan_id_conflict(&group.conflict_id, keep as u32)
        .await
        .unwrap();
    assert_eq!(result.registered_count, 10);
    assert_eq!(result.regenerated_count, 9);
    assert_eq!(app.read_manifest(&snapshots[9]).id, snapshots[0].id);
    let ids = snapshots
        .iter()
        .map(|snapshot| app.read_manifest(snapshot).id)
        .collect::<HashSet<_>>();
    assert_eq!(ids.len(), 10);
    for (index, snapshot) in snapshots.iter().enumerate().skip(1) {
        assert_eq!(
            std::fs::read_to_string(app.managed_workspace_root(snapshot).join("note.md")).unwrap(),
            format!("笔记 {index}")
        );
    }
    let restarted = app.start().await;
    assert_eq!(restarted.list_workspaces().await.len(), 10);
    for id in ids {
        restarted.open_workspace(&id).await.unwrap();
    }
    let again = restarted.scan_managed_workspaces().await.unwrap();
    assert!(again.id_conflicts.is_empty());
    assert_eq!(again.already_registered_count, 10);
    assert_eq!(again.registered_count, 0);
}

#[tokio::test]
async fn choosing_new_folder_rekeys_registered_workspace_and_session() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let snapshots = duplicate_group(&app, &manager, 3, true).await;
    manager.open_workspace(&snapshots[0].id).await.unwrap();
    manager.close_workspace(&snapshots[0].id).await.unwrap();
    let scan = manager.scan_managed_workspaces().await.unwrap();
    let group = &scan.id_conflicts[0];
    assert!(group.candidates[0].is_registered);
    let keep = group
        .candidates
        .iter()
        .position(|candidate| candidate.display_name == "Copy 2")
        .unwrap();
    let result = manager
        .resolve_scan_id_conflict(&group.conflict_id, keep as u32)
        .await
        .unwrap();
    assert_eq!(result.registered_count, 2);
    assert_eq!(result.regenerated_count, 2);
    let new_registered_id = app.read_manifest(&snapshots[0]).id;
    assert_ne!(new_registered_id, snapshots[0].id);
    assert_eq!(
        manager.get_last_workspace_id().await,
        Some(new_registered_id)
    );
    let catalog: serde_json::Value = serde_json::from_slice(
        &std::fs::read(app.data_dir.join("workspace-catalog.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(catalog["initialWorkspaceId"], new_registered_id.to_string());
    assert_eq!(app.read_manifest(&snapshots[2]).id, snapshots[0].id);
    assert_eq!(
        manager
            .open_workspace(&snapshots[0].id)
            .await
            .unwrap()
            .display_name,
        "Copy 2"
    );
    assert_eq!(manager.list_workspaces().await.len(), 3);
}

#[tokio::test]
async fn refuses_to_rekey_open_workspace_but_can_keep_its_id() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let snapshots = duplicate_group(&app, &manager, 3, true).await;
    let scan = manager.scan_managed_workspaces().await.unwrap();
    let group = &scan.id_conflicts[0];
    // 弹窗期间打开也必须在提交时检测出来。
    manager.open_workspace(&snapshots[0].id).await.unwrap();
    assert!(matches!(
        manager
            .resolve_scan_id_conflict(&group.conflict_id, 1)
            .await
            .unwrap_err(),
        WorkspaceError::ScanConflict(_)
    ));
    for snapshot in &snapshots {
        assert_eq!(app.read_manifest(snapshot).id, snapshots[0].id);
    }
    assert_eq!(manager.list_workspaces().await.len(), 1);
    let result = manager
        .resolve_scan_id_conflict(&group.conflict_id, 0)
        .await
        .unwrap();
    assert_eq!(result.registered_count, 2);
    assert_eq!(app.read_manifest(&snapshots[0]).id, snapshots[0].id);
    assert!(manager.is_workspace_open(&snapshots[0].id).await);
}

#[tokio::test]
async fn rejects_changed_manifest_invalid_choice_and_old_scan_before_writing() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let snapshots = duplicate_group(&app, &manager, 3, true).await;
    let first_scan = manager.scan_managed_workspaces().await.unwrap();
    let second_scan = manager.scan_managed_workspaces().await.unwrap();
    assert!(manager
        .resolve_scan_id_conflict(&first_scan.id_conflicts[0].conflict_id, 0)
        .await
        .is_err());
    let group = &second_scan.id_conflicts[0];
    assert!(manager
        .resolve_scan_id_conflict(&group.conflict_id, 99)
        .await
        .is_err());
    let mut changed = app.read_manifest(&snapshots[2]);
    changed.id = WorkspaceId::new();
    std::fs::write(
        app.managed_workspace_root(&snapshots[2])
            .join(".lonanote/manifest.json"),
        serde_json::to_vec_pretty(&changed).unwrap(),
    )
    .unwrap();
    assert!(manager
        .resolve_scan_id_conflict(&group.conflict_id, 0)
        .await
        .is_err());
    assert_eq!(app.read_manifest(&snapshots[0]).id, snapshots[0].id);
    assert_eq!(app.read_manifest(&snapshots[1]).id, snapshots[0].id);
    assert_eq!(manager.list_workspaces().await.len(), 1);
}

#[tokio::test]
async fn catalog_write_failure_restores_manifests_and_session() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let snapshots = duplicate_group(&app, &manager, 3, true).await;
    manager.open_workspace(&snapshots[0].id).await.unwrap();
    manager.close_workspace(&snapshots[0].id).await.unwrap();
    let scan = manager.scan_managed_workspaces().await.unwrap();
    let group = &scan.id_conflicts[0];
    // 保留原文件，在目标位置创建目录以模拟 Catalog 原子替换失败。
    let catalog_path = app.data_dir.join("workspace-catalog.json");
    std::fs::rename(&catalog_path, app.data_dir.join("catalog-saved.json")).unwrap();
    std::fs::create_dir(&catalog_path).unwrap();
    assert!(manager
        .resolve_scan_id_conflict(&group.conflict_id, 1)
        .await
        .is_err());
    for snapshot in &snapshots {
        assert_eq!(app.read_manifest(snapshot).id, snapshots[0].id);
    }
    assert_eq!(manager.list_workspaces().await.len(), 1);
    assert_eq!(manager.get_last_workspace_id().await, Some(snapshots[0].id));
}

#[tokio::test]
async fn registered_external_folder_participates_and_unrelated_workspace_is_registered() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let external = manager
        .create_external_workspace(
            external_binding(app.external_dir("external")),
            "External".into(),
        )
        .await
        .unwrap();
    manager.close_workspace(&external.id).await.unwrap();
    let copied = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Copy".into())
        .await
        .unwrap();
    manager.close_workspace(&copied.id).await.unwrap();
    manager.remove_workspace(&copied.id, false).await.unwrap();
    let mut manifest = app.read_manifest(&copied);
    manifest.id = external.id;
    std::fs::write(
        app.managed_workspace_root(&copied)
            .join(".lonanote/manifest.json"),
        serde_json::to_vec_pretty(&manifest).unwrap(),
    )
    .unwrap();
    let unrelated = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Unrelated".into())
        .await
        .unwrap();
    manager.close_workspace(&unrelated.id).await.unwrap();
    manager
        .remove_workspace(&unrelated.id, false)
        .await
        .unwrap();
    let scan = manager.scan_managed_workspaces().await.unwrap();
    assert_eq!(scan.registered_count, 1);
    assert_eq!(scan.id_conflicts.len(), 1);
    let group = &scan.id_conflicts[0];
    assert_eq!(group.candidates[0].display_name, "External");
    assert!(group.candidates[0].is_registered);
    manager
        .resolve_scan_id_conflict(&group.conflict_id, 0)
        .await
        .unwrap();
    assert_ne!(app.read_manifest(&copied).id, external.id);
    assert_eq!(manager.list_workspaces().await.len(), 3);
}

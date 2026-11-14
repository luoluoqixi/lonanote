use lonanote_core::workspace::WriteOptions;

use super::support::{path, WorkspaceTestApp};

#[tokio::test]
async fn text_writes_keep_bounded_history_and_restore_without_losing_current_text() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(
            super::support::provider(super::support::MANAGED_PROVIDER),
            "History".into(),
        )
        .await
        .unwrap();
    let mut settings = manager.get_settings(&created.id).await.unwrap();
    settings.history_snapshot_count = 2;
    settings.history_snapshot_interval_minutes = 0;
    manager.set_settings(&created.id, settings).await.unwrap();
    let file = path("notes/today.md");
    manager
        .write_text(&created.id, &file, "one", WriteOptions::default())
        .await
        .unwrap();
    manager
        .write_text(&created.id, &file, "two", WriteOptions::default())
        .await
        .unwrap();
    manager
        .write_text(&created.id, &file, "three", WriteOptions::default())
        .await
        .unwrap();

    let snapshots = manager.list_history(&created.id, &file).await.unwrap();
    assert_eq!(snapshots.len(), 2);
    let mut contents = Vec::new();
    for snapshot in &snapshots {
        contents.push((
            snapshot.id.clone(),
            manager
                .read_history(&created.id, &file, &snapshot.id)
                .await
                .unwrap(),
        ));
    }
    assert_eq!(contents[0].1, "two");
    assert_eq!(contents[1].1, "one");
    assert!(contents.iter().any(|(_, content)| content == "two"));
    let restore_id = contents
        .iter()
        .find(|(_, content)| content == "one")
        .map(|(id, _)| id)
        .unwrap();
    manager
        .restore_history(&created.id, &file, restore_id)
        .await
        .unwrap();
    assert_eq!(manager.read_text(&created.id, &file).await.unwrap(), "one");
    assert!(
        manager
            .list_history(&created.id, &file)
            .await
            .unwrap()
            .len()
            <= 2
    );

    let root = app.managed_workspace_root(&created);
    let history_root = root.join(".lonanote/cache/history");
    assert!(history_root.exists());
    let bucket = std::fs::read_dir(&history_root)
        .unwrap()
        .next()
        .unwrap()
        .unwrap()
        .path();
    let snapshot_files = std::fs::read_dir(bucket)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .collect::<Vec<_>>();
    assert!(snapshot_files
        .iter()
        .all(|file| file.extension().is_some_and(|extension| extension == "md")));
    assert!(!snapshot_files.iter().any(|file| file
        .extension()
        .is_some_and(|extension| extension == "json")));
    assert!(snapshot_files
        .iter()
        .any(|file| std::fs::read_to_string(file).unwrap() == "two"));
}

#[tokio::test]
async fn history_snapshot_interval_reduces_writes_and_restore_is_forced() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(
            super::support::provider(super::support::MANAGED_PROVIDER),
            "History interval".into(),
        )
        .await
        .unwrap();
    let mut settings = manager.get_settings(&created.id).await.unwrap();
    settings.history_snapshot_count = 5;
    settings.history_snapshot_interval_minutes = 5;
    manager.set_settings(&created.id, settings).await.unwrap();
    let file = path("notes/today.md");

    manager
        .write_text(&created.id, &file, "one", WriteOptions::default())
        .await
        .unwrap();
    manager
        .write_text(&created.id, &file, "two", WriteOptions::default())
        .await
        .unwrap();
    manager
        .write_text(&created.id, &file, "three", WriteOptions::default())
        .await
        .unwrap();

    let snapshots = manager.list_history(&created.id, &file).await.unwrap();
    assert_eq!(snapshots.len(), 1);
    assert_eq!(
        manager
            .read_history(&created.id, &file, &snapshots[0].id)
            .await
            .unwrap(),
        "one"
    );

    manager
        .restore_history(&created.id, &file, &snapshots[0].id)
        .await
        .unwrap();
    let snapshots = manager.list_history(&created.id, &file).await.unwrap();
    assert_eq!(snapshots.len(), 2);
    let mut contents = Vec::new();
    for snapshot in &snapshots {
        contents.push(
            manager
                .read_history(&created.id, &file, &snapshot.id)
                .await
                .unwrap(),
        );
    }
    assert!(contents.iter().any(|content| content == "three"));
}

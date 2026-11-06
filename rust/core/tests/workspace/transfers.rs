use crate::support::{path, provider, WorkspaceTestApp, MANAGED_PROVIDER};
use lonanote_core::workspace::{
    TransferConflictPolicy, TransferOperation, TransferSource, TransferStatus, WriteOptions,
};

#[tokio::test]
async fn batch_transfer_preserves_extensions_and_partial_failures() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let ws = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Transfer".into())
        .await
        .unwrap();
    manager
        .write_text(&ws.id, &path("a.md"), "note", WriteOptions::default())
        .await
        .unwrap();
    let result = manager
        .transfer_entries(
            &ws.id,
            vec![
                TransferSource {
                    path: path("a.md"),
                    expected_metadata: None,
                },
                TransferSource {
                    path: path("missing"),
                    expected_metadata: None,
                },
            ],
            path(""),
            TransferOperation::Copy,
            TransferConflictPolicy::KeepBoth,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Succeeded);
    assert_eq!(result[0].target_path, Some(path("a (1).md")));
    assert_eq!(result[1].status, TransferStatus::Failed);
    assert_eq!(
        manager.read_text(&ws.id, &path("a.md")).await.unwrap(),
        "note"
    );
    let result = manager
        .transfer_entries(
            &ws.id,
            vec![TransferSource {
                path: path("a.md"),
                expected_metadata: None,
            }],
            path(""),
            TransferOperation::Move,
            TransferConflictPolicy::Error,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Succeeded);
    assert_eq!(result[0].target_path, Some(path("a (2).md")));
}

#[tokio::test]
async fn clipboard_allows_content_updates_but_rejects_recreated_sources() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let ws = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Identity".into())
        .await
        .unwrap();
    let source = path("source.md");
    manager
        .write_text(&ws.id, &source, "old", WriteOptions::default())
        .await
        .unwrap();
    let recorded = manager.file_metadata(&ws.id, &source).await.unwrap();
    manager
        .write_text(&ws.id, &source, "latest content", WriteOptions::default())
        .await
        .unwrap();
    let transfer = || {
        vec![TransferSource {
            path: source.clone(),
            expected_metadata: Some(recorded.clone()),
        }]
    };
    for name in ["source (1).md", "source (2).md"] {
        let result = manager
            .transfer_entries(
                &ws.id,
                transfer(),
                path(""),
                TransferOperation::Copy,
                TransferConflictPolicy::KeepBoth,
            )
            .await
            .unwrap();
        assert_eq!(result[0].status, TransferStatus::Succeeded);
        assert_eq!(
            manager.read_text(&ws.id, &path(name)).await.unwrap(),
            "latest content"
        );
    }
    manager.remove(&ws.id, &source, false).await.unwrap();
    manager
        .write_text(&ws.id, &source, "replacement", WriteOptions::default())
        .await
        .unwrap();
    let result = manager
        .transfer_entries(
            &ws.id,
            transfer(),
            path(""),
            TransferOperation::Copy,
            TransferConflictPolicy::KeepBoth,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Failed);
}

#[tokio::test]
async fn overwrite_transfer_replaces_file_and_directory_without_merging() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let ws = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Overwrite".into())
        .await
        .unwrap();
    manager
        .write_text(&ws.id, &path("src/a.md"), "new", WriteOptions::default())
        .await
        .unwrap();
    manager
        .write_text(&ws.id, &path("dst/a.md"), "old", WriteOptions::default())
        .await
        .unwrap();
    let overwrite = serde_json::from_str::<TransferConflictPolicy>("\"overwrite\"").unwrap();
    let result = manager
        .transfer_entries(
            &ws.id,
            vec![TransferSource {
                path: path("src/a.md"),
                expected_metadata: None,
            }],
            path("dst"),
            TransferOperation::Copy,
            overwrite,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Succeeded);
    assert_eq!(
        manager.read_text(&ws.id, &path("dst/a.md")).await.unwrap(),
        "new"
    );
    assert!(manager
        .file_exists(&ws.id, &path("src/a.md"))
        .await
        .unwrap());
    manager
        .write_text(
            &ws.id,
            &path("dst/src/stale.md"),
            "stale",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    let result = manager
        .transfer_entries(
            &ws.id,
            vec![TransferSource {
                path: path("src"),
                expected_metadata: None,
            }],
            path("dst"),
            TransferOperation::Move,
            overwrite,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Succeeded);
    assert_eq!(
        manager
            .read_text(&ws.id, &path("dst/src/a.md"))
            .await
            .unwrap(),
        "new"
    );
    assert!(!manager
        .file_exists(&ws.id, &path("dst/src/stale.md"))
        .await
        .unwrap());
    assert!(!manager.file_exists(&ws.id, &path("src")).await.unwrap());
}

#[tokio::test]
async fn overwrite_preserves_open_targets_sources_and_workspace_metadata() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let ws = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Protected".into())
        .await
        .unwrap();
    manager
        .write_text(&ws.id, &path("src/a.md"), "source", WriteOptions::default())
        .await
        .unwrap();
    manager
        .write_text(
            &ws.id,
            &path("dst/a.md"),
            "open target",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    let source = || {
        vec![TransferSource {
            path: path("src/a.md"),
            expected_metadata: None,
        }]
    };
    let result = manager
        .transfer_entries_protected(
            &ws.id,
            source(),
            path("dst"),
            TransferOperation::Copy,
            TransferConflictPolicy::Overwrite,
            vec![path("dst/a.md")],
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Failed);
    assert_eq!(
        manager.read_text(&ws.id, &path("dst/a.md")).await.unwrap(),
        "open target"
    );
    let result = manager
        .transfer_entries(
            &ws.id,
            source(),
            path("src"),
            TransferOperation::Copy,
            TransferConflictPolicy::Overwrite,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Succeeded);
    assert_eq!(result[0].target_path, Some(path("src/a (1).md")));
    assert_eq!(
        manager.read_text(&ws.id, &path("src/a.md")).await.unwrap(),
        "source"
    );
    manager
        .write_text(
            &ws.id,
            &path("src/.lonanote/fake.md"),
            "fake",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    let result = manager
        .transfer_entries(
            &ws.id,
            vec![TransferSource {
                path: path("src/.lonanote"),
                expected_metadata: None,
            }],
            path(""),
            TransferOperation::Move,
            TransferConflictPolicy::Overwrite,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Failed);
    assert!(manager
        .file_exists(&ws.id, &path("src/.lonanote/fake.md"))
        .await
        .unwrap());
    // 根目录的目标若包含另一个批量来源，不能先覆盖它。
    manager
        .write_text(
            &ws.id,
            &path("a.md/child.md"),
            "another source",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    let result = manager
        .transfer_entries(
            &ws.id,
            vec![
                TransferSource {
                    path: path("src/a.md"),
                    expected_metadata: None,
                },
                TransferSource {
                    path: path("a.md/child.md"),
                    expected_metadata: None,
                },
            ],
            path(""),
            TransferOperation::Copy,
            TransferConflictPolicy::Overwrite,
        )
        .await
        .unwrap();
    assert!(result
        .iter()
        .any(|r| r.source_path == path("src/a.md") && r.status == TransferStatus::Failed));
    assert_eq!(
        manager
            .read_text(&ws.id, &path("a.md/child.md"))
            .await
            .unwrap(),
        "another source"
    );
}

#[tokio::test]
async fn overwrite_batch_keeps_previous_success_and_failed_source() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let ws = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Batch conflict".into())
        .await
        .unwrap();
    for (p, content) in [
        ("a/n.md", "first"),
        ("b/n.md", "second"),
        ("dest/n.md", "old"),
    ] {
        manager
            .write_text(&ws.id, &path(p), content, WriteOptions::default())
            .await
            .unwrap();
    }
    let result = manager
        .transfer_entries(
            &ws.id,
            vec![
                TransferSource {
                    path: path("a/n.md"),
                    expected_metadata: None,
                },
                TransferSource {
                    path: path("b/n.md"),
                    expected_metadata: None,
                },
            ],
            path("dest"),
            TransferOperation::Move,
            TransferConflictPolicy::Overwrite,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Succeeded);
    assert_eq!(result[1].status, TransferStatus::Failed);
    assert_eq!(
        manager.read_text(&ws.id, &path("dest/n.md")).await.unwrap(),
        "first"
    );
    assert_eq!(
        manager.read_text(&ws.id, &path("b/n.md")).await.unwrap(),
        "second"
    );
}

#[cfg(windows)]
#[tokio::test]
async fn overwrite_rejects_actual_source_ancestor_with_different_case() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let ws = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Case guard".into())
        .await
        .unwrap();
    manager
        .write_text(
            &ws.id,
            &path("NOTE/sub/note"),
            "source",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    manager
        .write_text(
            &ws.id,
            &path("NOTE/keep.md"),
            "keep",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    let result = manager
        .transfer_entries(
            &ws.id,
            vec![TransferSource {
                path: path("NOTE/sub/note"),
                expected_metadata: None,
            }],
            path(""),
            TransferOperation::Copy,
            TransferConflictPolicy::Overwrite,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Failed);
    assert_eq!(
        manager
            .read_text(&ws.id, &path("NOTE/keep.md"))
            .await
            .unwrap(),
        "keep"
    );
    assert_eq!(
        manager
            .read_text(&ws.id, &path("NOTE/sub/note"))
            .await
            .unwrap(),
        "source"
    );
}

#[tokio::test]
async fn overwrite_rejects_reserved_directory_case_variants() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let ws = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Metadata guard".into())
        .await
        .unwrap();
    manager
        .write_text(
            &ws.id,
            &path("src/.LONANOTE/fake.md"),
            "keep",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    let result = manager
        .transfer_entries(
            &ws.id,
            vec![TransferSource {
                path: path("src/.LONANOTE"),
                expected_metadata: None,
            }],
            path(""),
            TransferOperation::Copy,
            TransferConflictPolicy::Overwrite,
        )
        .await
        .unwrap();
    assert_eq!(result[0].status, TransferStatus::Failed);
    assert_eq!(
        manager
            .read_text(&ws.id, &path("src/.LONANOTE/fake.md"))
            .await
            .unwrap(),
        "keep"
    );
}

#[tokio::test]
async fn same_directory_transfers_create_copies_and_preserve_sources() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let ws = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Duplicate".into())
        .await
        .unwrap();
    manager
        .write_text(
            &ws.id,
            &path("notes/folder/note.md"),
            "content",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    for operation in [TransferOperation::Copy, TransferOperation::Move] {
        for source in ["notes/folder", "notes/folder/note.md"] {
            let destination = if source.ends_with(".md") {
                "notes/folder"
            } else {
                "notes"
            };
            let result = manager
                .transfer_entries(
                    &ws.id,
                    vec![TransferSource {
                        path: path(source),
                        expected_metadata: None,
                    }],
                    path(destination),
                    operation,
                    TransferConflictPolicy::Error,
                )
                .await
                .unwrap();
            assert_eq!(result[0].status, TransferStatus::Succeeded);
            let target = result[0].target_path.as_ref().unwrap();
            assert_ne!(target, &path(source));
            let copied_file = if source.ends_with(".md") {
                target.clone()
            } else {
                target.join(&path("note.md"))
            };
            assert_eq!(
                manager.read_text(&ws.id, &copied_file).await.unwrap(),
                "content"
            );
            assert_eq!(
                manager
                    .read_text(&ws.id, &path("notes/folder/note.md"))
                    .await
                    .unwrap(),
                "content"
            );
        }
    }
}

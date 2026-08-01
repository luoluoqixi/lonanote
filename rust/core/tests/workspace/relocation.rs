use crate::support::{external_binding, path, provider, WorkspaceTestApp, MANAGED_PROVIDER};
use lonanote_core::workspace::{
    StorageCleanupStatus, WorkspaceDirectoryName, WorkspaceError, WorkspaceStorageTarget,
    WriteOptions,
};

#[tokio::test]
async fn validates_target() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Source".into())
        .await
        .unwrap();

    let target = app.external_dir("target");
    assert!(matches!(
        manager
            .relocate_workspace(
                &created.id,
                WorkspaceStorageTarget::External {
                    binding: external_binding(&target)
                }
            )
            .await
            .unwrap_err(),
        WorkspaceError::CannotModifyOpenWorkspace(id) if id == created.id
    ));
    manager.close_workspace(&created.id).await.unwrap();

    std::fs::write(target.join("occupied.txt"), "occupied").unwrap();
    assert!(matches!(
        manager
            .relocate_workspace(
                &created.id,
                WorkspaceStorageTarget::External {
                    binding: external_binding(&target)
                }
            )
            .await
            .unwrap_err(),
        WorkspaceError::TargetNotEmpty
    ));

    assert!(matches!(
        manager
            .relocate_workspace(
                &created.id,
                WorkspaceStorageTarget::Managed {
                    provider_id: provider(MANAGED_PROVIDER),
                    preferred_directory_name: created.storage.directory_name.unwrap(),
                }
            )
            .await
            .unwrap_err(),
        WorkspaceError::SameStorageBinding
    ));
}

#[tokio::test]
async fn relocates_and_retains_source() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Relocate".into())
        .await
        .unwrap();
    let source_root = app.managed_workspace_root(&created);
    manager
        .write_text(
            &created.id,
            &path("notes/important.md"),
            "content",
            WriteOptions::default(),
        )
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();

    let target = app.external_dir("relocated");
    let result = manager
        .relocate_workspace(
            &created.id,
            WorkspaceStorageTarget::External {
                binding: external_binding(&target),
            },
        )
        .await
        .unwrap();
    assert_eq!(result.source_cleanup, StorageCleanupStatus::Retained);
    assert!(source_root.join("notes/important.md").exists());
    assert_eq!(
        std::fs::read_to_string(target.join("notes/important.md")).unwrap(),
        "content"
    );

    drop(manager);
    let restarted = app.start().await;
    restarted.open_workspace(&created.id).await.unwrap();
    assert_eq!(
        restarted
            .read_text(&created.id, &path("notes/important.md"))
            .await
            .unwrap(),
        "content"
    );
    restarted.close_workspace(&created.id).await.unwrap();
    let removed = restarted.remove_workspace(&created.id, true).await.unwrap();
    assert_eq!(removed.file_cleanup, StorageCleanupStatus::Removed);
    assert!(!target.exists());
    assert!(source_root.exists());
}

#[tokio::test]
async fn relocates_to_managed_storage() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let external = app.external_dir("source-external");
    let created = manager
        .create_external_workspace(external_binding(&external), "Move Managed".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();

    let directory_name = WorkspaceDirectoryName::parse("chosen-directory").unwrap();
    let result = manager
        .relocate_workspace(
            &created.id,
            WorkspaceStorageTarget::Managed {
                provider_id: provider(MANAGED_PROVIDER),
                preferred_directory_name: directory_name.clone(),
            },
        )
        .await
        .unwrap();
    assert_eq!(
        result.target_binding,
        crate::support::workspace_test_app::managed_binding(directory_name.as_str())
    );
    assert!(app
        .managed_root
        .join("workspaces/chosen-directory/.lonanote/manifest.json")
        .exists());
}

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
async fn rejects_external_alias_as_same_target() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let root = app.external_dir("same-external-target");
    let created = manager
        .create_external_workspace(external_binding(&root), "Same Target".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let alias = root.join("..").join("same-external-target");

    assert!(matches!(
        manager
            .relocate_workspace(
                &created.id,
                WorkspaceStorageTarget::External {
                    binding: external_binding(alias),
                },
            )
            .await
            .unwrap_err(),
        WorkspaceError::SameStorageBinding
    ));
}

#[tokio::test]
async fn relocates_and_removes_source() {
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
    assert_eq!(result.source_cleanup, StorageCleanupStatus::Removed);
    assert!(!source_root.exists());
    assert_eq!(
        std::fs::read_to_string(target.join("notes/important.md")).unwrap(),
        "content"
    );
    assert!(target.join(".lonanote/manifest.json").exists());
    assert!(target.join(".lonanote/settings.json").exists());
    assert!(target.join(".lonanote/settings.local.json").exists());

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
    assert!(!source_root.exists());
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
        result.target_storage,
        lonanote_core::workspace::WorkspaceStorageView::from(
            &crate::support::workspace_test_app::managed_binding(directory_name.as_str())
        )
    );
    assert!(app
        .managed_root
        .join("workspaces/chosen-directory/.lonanote/manifest.json")
        .exists());
}

#[tokio::test]
async fn rebinds_missing_source_without_changing_target_files() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Relink".into())
        .await
        .unwrap();
    let old = app.managed_workspace_root(&created);
    manager.close_workspace(&created.id).await.unwrap();
    let target = app.external_dir("relinked");
    std::fs::remove_dir(&target).unwrap();
    std::fs::rename(&old, &target).unwrap();
    let manifest_before = std::fs::read(target.join(".lonanote/manifest.json")).unwrap();
    let view = manager
        .rebind_workspace(&created.id, external_binding(&target))
        .await
        .unwrap();
    assert_eq!(view.provider_id, provider("desktop-folder"));
    assert_eq!(
        std::fs::read(target.join(".lonanote/manifest.json")).unwrap(),
        manifest_before
    );
    manager.open_workspace(&created.id).await.unwrap();
    assert!(!old.exists());
}

#[tokio::test]
async fn rebind_rejects_unrelated_workspace() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let first = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "First".into())
        .await
        .unwrap();
    let second_root = app.external_dir("second");
    let second = manager
        .create_external_workspace(external_binding(&second_root), "Second".into())
        .await
        .unwrap();
    manager.close_workspace(&first.id).await.unwrap();
    manager.close_workspace(&second.id).await.unwrap();
    assert!(manager
        .rebind_workspace(&first.id, external_binding(&second_root))
        .await
        .is_err());
    manager.open_workspace(&first.id).await.unwrap();
}

#[tokio::test]
async fn rejects_nested_target_before_copying() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Nested".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let nested = app.managed_workspace_root(&created).join("nested");
    std::fs::create_dir(&nested).unwrap();
    assert!(manager
        .relocate_workspace(
            &created.id,
            WorkspaceStorageTarget::External {
                binding: external_binding(&nested)
            }
        )
        .await
        .is_err());
    assert_eq!(std::fs::read_dir(&nested).unwrap().count(), 0);
}

#[tokio::test]
async fn rejects_managed_directory_name_conflict_without_suffix() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Exact".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let occupied = app.managed_root.join("workspaces/Occupied");
    std::fs::create_dir(&occupied).unwrap();
    std::fs::write(occupied.join("keep.txt"), "keep").unwrap();
    assert!(manager
        .relocate_workspace(
            &created.id,
            WorkspaceStorageTarget::Managed {
                provider_id: provider(MANAGED_PROVIDER),
                preferred_directory_name: WorkspaceDirectoryName::parse("Occupied").unwrap()
            }
        )
        .await
        .is_err());
    assert!(!app.managed_root.join("workspaces/Occupied-2").exists());
    assert_eq!(
        std::fs::read_to_string(occupied.join("keep.txt")).unwrap(),
        "keep"
    );
}

#[tokio::test]
async fn rejects_managed_external_alias_and_preserves_source() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Alias".into())
        .await
        .unwrap();
    let root = app.managed_workspace_root(&created);
    manager.close_workspace(&created.id).await.unwrap();
    assert!(matches!(
        manager
            .relocate_workspace(
                &created.id,
                WorkspaceStorageTarget::External {
                    binding: external_binding(&root)
                }
            )
            .await
            .unwrap_err(),
        WorkspaceError::SameStorageBinding
    ));
    assert!(root.join(".lonanote/manifest.json").exists());
}

async fn persist_interrupted_relocation(
    app: &WorkspaceTestApp,
    created: &lonanote_core::workspace::WorkspaceSnapshot,
    target: &std::path::Path,
    committed: bool,
) {
    use lonanote_core::workspace::WorkspaceStorageResolver;
    let catalog_path = app.data_dir.join("workspace-catalog.json");
    let mut catalog: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&catalog_path).unwrap()).unwrap();
    let source = catalog["workspaces"][created.id.to_string()]["storageBinding"].clone();
    let request = external_binding(target);
    let target_binding = request
        .clone()
        .resolve(app.resolver.resolve_identity(&request).await.unwrap());
    catalog["pendingRelocations"] = serde_json::json!([{
        "workspaceId": created.id, "source": source, "target": target_binding
    }]);
    if committed {
        catalog["workspaces"][created.id.to_string()]["storageBinding"] =
            serde_json::to_value(target_binding).unwrap();
    }
    std::fs::write(catalog_path, serde_json::to_vec_pretty(&catalog).unwrap()).unwrap();
}

#[tokio::test]
async fn restart_defers_recovery_until_explicit_scan_and_preserves_external_root() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Interrupted".into())
        .await
        .unwrap();
    let source = app.managed_workspace_root(&created);
    manager.close_workspace(&created.id).await.unwrap();
    drop(manager);
    let target = app.external_dir("interrupted-target");
    std::fs::create_dir(target.join(".lonanote")).unwrap();
    std::fs::copy(
        source.join(".lonanote/manifest.json"),
        target.join(".lonanote/manifest.json"),
    )
    .unwrap();
    persist_interrupted_relocation(&app, &created, &target, false).await;
    let restarted = app.start().await;
    assert!(
        target.join(".lonanote/manifest.json").exists(),
        "初始化不执行递归恢复"
    );
    let result = restarted.scan_managed_workspaces().await.unwrap();
    assert!(result.id_conflicts.is_empty());
    assert!(target.exists());
    assert_eq!(std::fs::read_dir(&target).unwrap().count(), 0);
    restarted.open_workspace(&created.id).await.unwrap();
}

#[tokio::test]
async fn committed_interruption_recovers_cleanup_without_losing_files() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Committed".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let source = app.managed_workspace_root(&created);
    drop(manager);
    let target = app.external_dir("committed-target");
    copy_directory(&source, &target);
    persist_interrupted_relocation(&app, &created, &target, true).await;
    let restarted = app.start().await;
    assert!(source.exists());
    restarted.scan_managed_workspaces().await.unwrap();
    assert!(!source.exists());
    restarted.open_workspace(&created.id).await.unwrap();
}

fn copy_directory(source: &std::path::Path, target: &std::path::Path) {
    std::fs::create_dir_all(target).unwrap();
    for entry in std::fs::read_dir(source).unwrap() {
        let entry = entry.unwrap();
        if entry.file_type().unwrap().is_dir() {
            copy_directory(&entry.path(), &target.join(entry.file_name()));
        } else {
            std::fs::copy(entry.path(), target.join(entry.file_name())).unwrap();
        }
    }
}

#[tokio::test]
async fn changed_source_is_quarantined_and_does_not_block_next_migration() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Changed Source".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let source = app.managed_workspace_root(&created);
    drop(manager);
    let target = app.external_dir("changed-source-target");
    copy_directory(&source, &target);
    persist_interrupted_relocation(&app, &created, &target, true).await;
    std::fs::write(source.join("do-not-delete.txt"), "new external edits").unwrap();
    let restarted = app.start().await;
    let scan = restarted.scan_managed_workspaces().await.unwrap();
    assert!(scan.id_conflicts.is_empty());
    assert_eq!(
        std::fs::read_to_string(source.join("do-not-delete.txt")).unwrap(),
        "new external edits"
    );
    let next = app.external_dir("next-target");
    let moved = restarted
        .relocate_workspace(
            &created.id,
            WorkspaceStorageTarget::External {
                binding: external_binding(&next),
            },
        )
        .await
        .unwrap();
    assert_eq!(moved.source_cleanup, StorageCleanupStatus::Removed);
    assert!(source.join("do-not-delete.txt").exists());
    let scan = restarted.scan_managed_workspaces().await.unwrap();
    assert!(scan.id_conflicts.is_empty());
    assert_eq!(scan.registered_count, 0);
}

#[tokio::test]
async fn rebind_refreshes_manifest_summary_without_modifying_display_name() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Old Display".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let root = app.managed_workspace_root(&created);
    let manifest_path = root.join(".lonanote/manifest.json");
    let mut manifest: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
    manifest["displayName"] = serde_json::json!("Changed Outside");
    std::fs::write(&manifest_path, serde_json::to_vec(&manifest).unwrap()).unwrap();
    let before = std::fs::read(&manifest_path).unwrap();
    manager
        .rebind_workspace(&created.id, external_binding(&root))
        .await
        .unwrap();
    let listed = manager.list_workspaces().await;
    assert_eq!(
        listed
            .iter()
            .find(|item| item.id == created.id)
            .unwrap()
            .display_name,
        "Changed Outside"
    );
    assert_eq!(std::fs::read(&manifest_path).unwrap(), before);
}

#[tokio::test]
async fn source_id_mismatch_does_not_create_target() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Mismatch Source".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let manifest_path = app
        .managed_workspace_root(&created)
        .join(".lonanote/manifest.json");
    let mut manifest: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
    manifest["id"] = serde_json::json!(lonanote_core::workspace::WorkspaceId::new());
    std::fs::write(&manifest_path, serde_json::to_vec(&manifest).unwrap()).unwrap();
    assert!(matches!(
        manager
            .relocate_workspace(
                &created.id,
                WorkspaceStorageTarget::Managed {
                    provider_id: provider(MANAGED_PROVIDER),
                    preferred_directory_name: WorkspaceDirectoryName::parse("must-not-create")
                        .unwrap()
                }
            )
            .await
            .unwrap_err(),
        WorkspaceError::WorkspaceIdMismatch { .. }
    ));
    assert!(!app.managed_root.join("workspaces/must-not-create").exists());
}

#[tokio::test]
async fn unknown_partial_target_is_preserved_and_blocks_new_migration() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Unknown Partial".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    drop(manager);
    let target = app.external_dir("unknown-partial-target");
    std::fs::write(target.join("user-added.txt"), "not ours").unwrap();
    persist_interrupted_relocation(&app, &created, &target, false).await;
    let restarted = app.start().await;
    restarted.scan_managed_workspaces().await.unwrap();
    assert_eq!(
        std::fs::read_to_string(target.join("user-added.txt")).unwrap(),
        "not ours"
    );
    let next = app.external_dir("blocked-next-target");
    assert!(matches!(
        restarted
            .relocate_workspace(
                &created.id,
                WorkspaceStorageTarget::External {
                    binding: external_binding(&next)
                }
            )
            .await
            .unwrap_err(),
        WorkspaceError::Relocation(_)
    ));
    assert_eq!(std::fs::read_dir(&next).unwrap().count(), 0);
}

#[tokio::test]
async fn scan_skips_both_managed_sides_of_unresolved_migration() {
    use lonanote_core::workspace::{
        WorkspaceStorageBindingRequest, WorkspaceStorageLocation, WorkspaceStorageResolver,
    };
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Managed Pending".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    drop(manager);
    let target = app.managed_root.join("workspaces/pending-target");
    copy_directory(&app.managed_workspace_root(&created), &target);
    std::fs::write(target.join("unknown.txt"), "retain").unwrap();
    let catalog_path = app.data_dir.join("workspace-catalog.json");
    let mut catalog: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&catalog_path).unwrap()).unwrap();
    let source = catalog["workspaces"][created.id.to_string()]["storageBinding"].clone();
    let request = WorkspaceStorageBindingRequest {
        provider_id: provider(MANAGED_PROVIDER),
        provider_schema_version: 1,
        location: WorkspaceStorageLocation::Managed {
            directory_name: WorkspaceDirectoryName::parse("pending-target").unwrap(),
        },
    };
    let target_binding = request
        .clone()
        .resolve(app.resolver.resolve_identity(&request).await.unwrap());
    catalog["pendingRelocations"] = serde_json::json!([{ "workspaceId": created.id, "source": source, "target": target_binding }]);
    std::fs::write(catalog_path, serde_json::to_vec_pretty(&catalog).unwrap()).unwrap();
    let restarted = app.start().await;
    let scan = restarted.scan_managed_workspaces().await.unwrap();
    assert!(scan.id_conflicts.is_empty());
    assert_eq!(scan.registered_count, 0);
    assert_eq!(scan.invalid_count, 2);
    assert!(target.join("unknown.txt").exists());
}

#[tokio::test]
async fn catalog_write_failure_preserves_binding_and_source_files() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Catalog Failure".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let source = app.managed_workspace_root(&created);
    let external = app.external_dir("failed-rebind-target");
    copy_directory(&source, &external);
    let catalog_path = app.data_dir.join("workspace-catalog.json");
    let saved_catalog = std::fs::read(&catalog_path).unwrap();
    std::fs::remove_file(&catalog_path).unwrap();
    std::fs::create_dir(&catalog_path).unwrap();
    assert!(manager
        .rebind_workspace(&created.id, external_binding(&external))
        .await
        .is_err());
    assert_eq!(manager.list_workspaces().await[0].storage, created.storage);
    assert!(manager
        .relocate_workspace(
            &created.id,
            WorkspaceStorageTarget::Managed {
                provider_id: provider(MANAGED_PROVIDER),
                preferred_directory_name: WorkspaceDirectoryName::parse("failed-target").unwrap()
            }
        )
        .await
        .is_err());
    assert!(source.join(".lonanote/manifest.json").exists());
    assert!(external.join(".lonanote/manifest.json").exists());
    assert!(!app.managed_root.join("workspaces/failed-target").exists());
    std::fs::remove_dir(&catalog_path).unwrap();
    std::fs::write(catalog_path, saved_catalog).unwrap();
}

struct CleanupFailureResolver(std::sync::Arc<lonanote_core::workspace::LocalFsResolver>);

#[async_trait::async_trait]
impl lonanote_core::workspace::WorkspaceStorageResolver for CleanupFailureResolver {
    fn same_resource(
        &self,
        a: &lonanote_core::workspace::WorkspaceStorageBinding,
        b: &lonanote_core::workspace::WorkspaceStorageBinding,
    ) -> bool {
        self.0.same_resource(a, b)
    }
    fn provider_ids(&self) -> Vec<lonanote_core::workspace::StorageProviderId> {
        self.0.provider_ids()
    }
    fn managed_provider_ids(&self) -> Vec<lonanote_core::workspace::StorageProviderId> {
        self.0.managed_provider_ids()
    }
    async fn list_managed_workspace_bindings(
        &self,
        provider: &lonanote_core::workspace::StorageProviderId,
    ) -> Result<
        Vec<lonanote_core::workspace::WorkspaceStorageBindingRequest>,
        lonanote_core::workspace::StorageError,
    > {
        self.0.list_managed_workspace_bindings(provider).await
    }
    async fn resolve_identity(
        &self,
        request: &lonanote_core::workspace::WorkspaceStorageBindingRequest,
    ) -> Result<
        lonanote_core::workspace::StorageResourceIdentity,
        lonanote_core::workspace::StorageError,
    > {
        self.0.resolve_identity(request).await
    }
    async fn open(
        &self,
        binding: &lonanote_core::workspace::WorkspaceStorageBinding,
    ) -> Result<
        std::sync::Arc<lonanote_core::workspace::WorkspaceStorageSession>,
        lonanote_core::workspace::StorageError,
    > {
        self.0.open(binding).await
    }
    async fn create_managed(
        &self,
        provider: &lonanote_core::workspace::StorageProviderId,
        directory: &WorkspaceDirectoryName,
    ) -> Result<
        (
            lonanote_core::workspace::WorkspaceStorageBinding,
            std::sync::Arc<lonanote_core::workspace::WorkspaceStorageSession>,
        ),
        lonanote_core::workspace::StorageError,
    > {
        self.0.create_managed(provider, directory).await
    }
    async fn remove_workspace_root(
        &self,
        _binding: &lonanote_core::workspace::WorkspaceStorageBinding,
    ) -> Result<(), lonanote_core::workspace::StorageError> {
        Err(lonanote_core::workspace::StorageError::ReadOnly {
            operation: "test_cleanup",
        })
    }
    async fn validate_relocation(
        &self,
        source: &lonanote_core::workspace::WorkspaceStorageBinding,
        target: &lonanote_core::workspace::WorkspaceStorageBinding,
    ) -> Result<(), lonanote_core::workspace::StorageError> {
        self.0.validate_relocation(source, target).await
    }
}

#[tokio::test]
async fn cleanup_failure_reports_committed_success_and_quarantines_old_source() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Cleanup Failure".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    drop(manager);
    let failing = lonanote_core::workspace::WorkspaceManager::load(
        &app.data_dir,
        std::sync::Arc::new(CleanupFailureResolver(app.resolver.clone())),
    )
    .await
    .unwrap();
    let target = app.external_dir("cleanup-failed-target");
    let result = failing
        .relocate_workspace(
            &created.id,
            WorkspaceStorageTarget::External {
                binding: external_binding(&target),
            },
        )
        .await
        .unwrap();
    assert!(matches!(
        result.source_cleanup,
        StorageCleanupStatus::Failed { .. }
    ));
    assert_eq!(
        failing.list_workspaces().await[0].storage.provider_id,
        provider("desktop-folder")
    );
    assert!(app
        .managed_workspace_root(&created)
        .join(".lonanote/manifest.json")
        .exists());
    failing.open_workspace(&created.id).await.unwrap();
    failing.close_workspace(&created.id).await.unwrap();
    let scan = failing.scan_managed_workspaces().await.unwrap();
    assert!(scan.id_conflicts.is_empty());
    assert_eq!(scan.registered_count, 0);
}

#[tokio::test]
async fn rebind_does_not_clean_completed_pending_external_copy() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Pending Rebind External".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let source = app.managed_workspace_root(&created);
    drop(manager);
    let target = app.external_dir("pending-rebind-external");
    copy_directory(&source, &target);
    persist_interrupted_relocation(&app, &created, &target, false).await;
    let before = std::fs::read(target.join(".lonanote/manifest.json")).unwrap();
    let restarted = app.start().await;
    assert!(restarted
        .rebind_workspace(&created.id, external_binding(&target))
        .await
        .is_err());
    assert_eq!(
        std::fs::read(target.join(".lonanote/manifest.json")).unwrap(),
        before
    );
    assert!(source.join(".lonanote/manifest.json").exists());
}

#[tokio::test]
async fn rebind_does_not_clean_completed_pending_managed_copy() {
    use lonanote_core::workspace::{
        WorkspaceStorageBindingRequest, WorkspaceStorageLocation, WorkspaceStorageResolver,
    };
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Pending Rebind Managed".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let source = app.managed_workspace_root(&created);
    drop(manager);
    let target = app.managed_root.join("workspaces/pending-rebind-managed");
    copy_directory(&source, &target);
    let request = WorkspaceStorageBindingRequest {
        provider_id: provider(MANAGED_PROVIDER),
        provider_schema_version: 1,
        location: WorkspaceStorageLocation::Managed {
            directory_name: WorkspaceDirectoryName::parse("pending-rebind-managed").unwrap(),
        },
    };
    let target_binding = request
        .clone()
        .resolve(app.resolver.resolve_identity(&request).await.unwrap());
    let catalog_path = app.data_dir.join("workspace-catalog.json");
    let mut catalog: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&catalog_path).unwrap()).unwrap();
    let source_binding = catalog["workspaces"][created.id.to_string()]["storageBinding"].clone();
    catalog["pendingRelocations"] = serde_json::json!([{ "workspaceId": created.id, "source": source_binding, "target": target_binding }]);
    std::fs::write(catalog_path, serde_json::to_vec_pretty(&catalog).unwrap()).unwrap();
    let before = std::fs::read(target.join(".lonanote/manifest.json")).unwrap();
    let restarted = app.start().await;
    assert!(restarted
        .rebind_workspace(&created.id, request)
        .await
        .is_err());
    assert_eq!(
        std::fs::read(target.join(".lonanote/manifest.json")).unwrap(),
        before
    );
    assert!(source.join(".lonanote/manifest.json").exists());
}

#[tokio::test]
async fn removing_registration_retains_both_directories_of_committed_pending_migration() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Removed Pending".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let source = app.managed_workspace_root(&created);
    drop(manager);
    let target = app.external_dir("removed-pending-target");
    copy_directory(&source, &target);
    persist_interrupted_relocation(&app, &created, &target, true).await;
    let before = std::fs::read(target.join(".lonanote/manifest.json")).unwrap();
    let restarted = app.start().await;
    restarted
        .remove_workspace(&created.id, false)
        .await
        .unwrap();
    restarted.scan_managed_workspaces().await.unwrap();
    assert_eq!(
        std::fs::read(target.join(".lonanote/manifest.json")).unwrap(),
        before
    );
    assert!(source.join(".lonanote/manifest.json").exists());
}

#[tokio::test]
async fn stale_missing_catalog_record_never_authorizes_target_cleanup() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Stale Missing Record".into())
        .await
        .unwrap();
    manager.close_workspace(&created.id).await.unwrap();
    let source = app.managed_workspace_root(&created);
    drop(manager);
    let target = app.external_dir("stale-missing-target");
    copy_directory(&source, &target);
    persist_interrupted_relocation(&app, &created, &target, true).await;
    let catalog_path = app.data_dir.join("workspace-catalog.json");
    let mut catalog: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&catalog_path).unwrap()).unwrap();
    catalog["workspaces"]
        .as_object_mut()
        .unwrap()
        .remove(&created.id.to_string());
    std::fs::write(catalog_path, serde_json::to_vec_pretty(&catalog).unwrap()).unwrap();
    let before = std::fs::read(target.join(".lonanote/manifest.json")).unwrap();
    let restarted = app.start().await;
    restarted.scan_managed_workspaces().await.unwrap();
    assert_eq!(
        std::fs::read(target.join(".lonanote/manifest.json")).unwrap(),
        before
    );
    assert!(source.join(".lonanote/manifest.json").exists());
}

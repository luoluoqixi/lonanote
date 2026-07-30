use std::{
    collections::BTreeSet,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
    time::Duration,
};

use async_trait::async_trait;
use lonanote_core::workspace::{
    install_workspace_manager, LocalFsResolver, LocalPathStorage, MemoryStorage,
    StorageCapabilities, StorageCleanupStatus, StorageEntry, StorageEntryMetadata, StorageError,
    StorageProviderId, WorkspaceCachedSummary, WorkspaceCatalog, WorkspaceDirectoryName,
    WorkspaceError, WorkspaceId, WorkspaceInstance, WorkspaceLocalStateStore, WorkspaceManager,
    WorkspaceManifest, WorkspaceRecord, WorkspaceRelativePath, WorkspaceRuntime, WorkspaceSettings,
    WorkspaceSnapshot, WorkspaceStorage, WorkspaceStorageBinding, WorkspaceStorageResolver,
    WorkspaceStorageSession, WorkspaceStorageTarget, WriteOptions,
};
use lonanote_core::{get_command_async_keys, init, invoke_command_async, CommandContext};
use serde::de::DeserializeOwned;
use serde_json::json;
use tempfile::TempDir;
use tokio::sync::Notify;

const MANAGED_PROVIDER: &str = "documents";
const EXTERNAL_PROVIDER: &str = "desktop-folder";

#[test]
fn domain_json_and_path_contract() {
    let id = WorkspaceId::new();
    let encoded = serde_json::to_string(&id).unwrap();
    assert_eq!(serde_json::from_str::<WorkspaceId>(&encoded).unwrap(), id);
    assert_eq!(id.to_string(), id.to_string().to_lowercase());
    assert_eq!(id.to_string().len(), 36);
    assert!(WorkspaceId::parse(id.to_string().to_uppercase()).is_err());

    for provider in ["documents", "desktop-folder", "app-local", "memory"] {
        assert_eq!(
            StorageProviderId::parse(provider).unwrap().as_str(),
            provider
        );
    }
    for provider in ["", " Documents", "iCloud", "a/b", "a\nb"] {
        assert!(
            StorageProviderId::parse(provider).is_err(),
            "{provider:?} 必须被拒绝"
        );
    }

    assert_eq!(
        WorkspaceDirectoryName::from_display_name("个人/笔记").as_str(),
        "个人-笔记"
    );
    for name in ["", ".", "..", "a/b", "a\\b", "CON", "note.", "note "] {
        assert!(
            WorkspaceDirectoryName::parse(name).is_err(),
            "{name:?} 必须被拒绝"
        );
    }

    for path in [
        "",
        "notes",
        "notes/today.md",
        ".lonanote/manifest.json",
        "中文目录/笔记.md",
    ] {
        assert_eq!(WorkspaceRelativePath::parse(path).unwrap().as_str(), path);
    }
    for path in [
        "/notes",
        "C:/notes",
        "C:notes",
        "notes\\today.md",
        ".",
        "..",
        "notes/../secret",
        "notes/./today.md",
        "notes//today.md",
        "notes/",
        "notes/\ntoday.md",
    ] {
        assert!(
            WorkspaceRelativePath::parse(path).is_err(),
            "{path:?} 必须被拒绝"
        );
    }

    let path = WorkspaceRelativePath::parse("notes/today.md").unwrap();
    assert_eq!(path.parent().unwrap().as_str(), "notes");
    assert_eq!(path.file_name().unwrap().as_str(), "today.md");
    assert_eq!(
        WorkspaceRelativePath::parse("notes")
            .unwrap()
            .join(&WorkspaceRelativePath::parse("today.md").unwrap()),
        path
    );

    let binding = WorkspaceStorageBinding::Managed {
        provider_id: provider(MANAGED_PROVIDER),
        directory_name: WorkspaceDirectoryName::parse("个人笔记").unwrap(),
    };
    let value = serde_json::to_value(&binding).unwrap();
    assert_eq!(value["kind"], "managed");
    assert_eq!(value["providerId"], MANAGED_PROVIDER);
    assert_eq!(value["directoryName"], "个人笔记");

    let settings_json = json!({
        "fileTreeSortType": "name",
        "followGitignore": true,
        "customIgnore": "",
        "uploadImagePath": "assets/images",
        "uploadAttachmentPath": "assets/attachments",
        "historySnapshotCount": 37
    });
    let settings: WorkspaceSettings = serde_json::from_value(settings_json).unwrap();
    assert_eq!(settings.history_snapshot_count, 37);
    let current_settings = serde_json::to_value(settings).unwrap();
    assert_eq!(current_settings["historySnapshotCount"], 37);

    let manifest = WorkspaceManifest::new(id, "个人笔记".to_string(), 123);
    let manifest_json = serde_json::to_value(manifest).unwrap();
    assert_eq!(manifest_json["schemaVersion"], 1);
    assert!(manifest_json.get("storageBinding").is_none());
    assert!(!manifest_json.to_string().contains("resourceRef"));
}

#[tokio::test]
async fn local_storage_contract_and_symlink_escape() {
    let root = TempDir::new().unwrap();
    let outside = TempDir::new().unwrap();
    let storage = LocalPathStorage::open(root.path()).unwrap();
    let root_path = WorkspaceRelativePath::root();
    assert!(storage.exists(&root_path).await.unwrap());

    let directory = WorkspaceRelativePath::parse("notes").unwrap();
    let file = WorkspaceRelativePath::parse("notes/今天.md").unwrap();
    storage.create_dir_all(&directory).await.unwrap();
    storage
        .write(&file, b"hello", WriteOptions::default())
        .await
        .unwrap();
    assert_eq!(storage.read(&file).await.unwrap(), b"hello");
    assert_eq!(storage.list_dir(&root_path).await.unwrap().len(), 1);
    assert_eq!(storage.list_dir(&directory).await.unwrap().len(), 1);

    let error = storage
        .write(
            &file,
            b"overwrite",
            WriteOptions {
                overwrite: false,
                create_parent: true,
                atomic: false,
            },
        )
        .await
        .unwrap_err();
    assert!(matches!(error, StorageError::AlreadyExists { .. }));
    assert_eq!(storage.read(&file).await.unwrap(), b"hello");

    storage
        .write(&file, b"atomic", WriteOptions::atomic_replace())
        .await
        .unwrap();
    assert_eq!(storage.read(&file).await.unwrap(), b"atomic");

    let renamed = WorkspaceRelativePath::parse("notes/renamed.md").unwrap();
    storage.rename(&file, &renamed).await.unwrap();
    assert!(!storage.exists(&file).await.unwrap());
    assert!(storage.exists(&renamed).await.unwrap());
    let error = storage.remove(&directory, false).await.unwrap_err();
    assert!(matches!(error, StorageError::DirectoryNotEmpty { .. }));
    storage.remove(&directory, true).await.unwrap();
    assert!(!storage.exists(&directory).await.unwrap());
    assert!(matches!(
        storage.remove(&root_path, true).await.unwrap_err(),
        StorageError::CannotModifyRoot
    ));

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;

        std::fs::write(outside.path().join("secret.md"), "secret").unwrap();
        symlink(outside.path(), root.path().join("escape")).unwrap();
        let escaped = WorkspaceRelativePath::parse("escape/secret.md").unwrap();
        assert!(matches!(
            storage.read(&escaped).await.unwrap_err(),
            StorageError::OutsideWorkspace { .. }
        ));
        assert!(matches!(
            storage
                .write(&escaped, b"changed", WriteOptions::default())
                .await
                .unwrap_err(),
            StorageError::OutsideWorkspace { .. }
        ));
        assert_eq!(
            std::fs::read_to_string(outside.path().join("secret.md")).unwrap(),
            "secret"
        );
    }
}

#[tokio::test]
async fn catalog_persistence_concurrency_and_backup_recovery() {
    let temp = TempDir::new().unwrap();
    let catalog_path = temp.path().join("workspace-catalog.json");
    let catalog = Arc::new(WorkspaceCatalog::load(&catalog_path).await.unwrap());
    let first = test_record("First", temp.path().join("first"));
    let second = test_record("Second", temp.path().join("second"));
    let first_id = first.id;
    let second_id = second.id;

    let add_first = {
        let catalog = Arc::clone(&catalog);
        tokio::spawn(async move { catalog.add(first).await })
    };
    let add_second = {
        let catalog = Arc::clone(&catalog);
        tokio::spawn(async move { catalog.add(second).await })
    };
    add_first.await.unwrap().unwrap();
    add_second.await.unwrap().unwrap();

    let loaded = WorkspaceCatalog::load(&catalog_path).await.unwrap();
    assert_eq!(loaded.list().await.len(), 2);
    assert_eq!(loaded.get(&first_id).await.unwrap().id, first_id);
    assert_eq!(loaded.get(&second_id).await.unwrap().id, second_id);
    assert!(temp.path().join("workspace-catalog.json.bak").exists());

    std::fs::write(&catalog_path, b"{corrupted").unwrap();
    let recovered = WorkspaceCatalog::load(&catalog_path).await.unwrap();
    let recovered_count = recovered.list().await.len();
    assert!(
        recovered_count == 1 || recovered_count == 2,
        "backup 必须是前一个完整 revision"
    );

    std::fs::remove_file(&catalog_path).unwrap();
    let recovered_without_primary = WorkspaceCatalog::load(&catalog_path).await.unwrap();
    assert!(
        !recovered_without_primary.list().await.is_empty(),
        "primary 缺失时也必须使用有效 backup"
    );

    let unsupported_path = temp.path().join("unsupported.json");
    std::fs::write(
        &unsupported_path,
        serde_json::to_vec_pretty(&json!({
            "schemaVersion": 999,
            "workspaces": {}
        }))
        .unwrap(),
    )
    .unwrap();
    assert!(matches!(
        WorkspaceCatalog::load(&unsupported_path).await.unwrap_err(),
        WorkspaceError::Catalog(_)
    ));

    let unsupported_state_path = temp.path().join("unsupported-state.json");
    std::fs::write(
        &unsupported_state_path,
        serde_json::to_vec_pretty(&json!({
            "schemaVersion": 999,
            "lastWorkspaceId": null,
            "workspaces": {}
        }))
        .unwrap(),
    )
    .unwrap();
    assert!(matches!(
        WorkspaceLocalStateStore::load(&unsupported_state_path)
            .await
            .unwrap_err(),
        WorkspaceError::LocalState(_)
    ));
}

#[tokio::test(flavor = "multi_thread", worker_threads = 4)]
async fn manager_files_index_lifecycle_relocate_and_locks() {
    let temp = TempDir::new().unwrap();
    let managed_root = temp.path().join("managed");
    let external_target = temp.path().join("external-target");
    std::fs::create_dir_all(&external_target).unwrap();
    let resolver = Arc::new(
        LocalFsResolver::new()
            .with_managed_provider(provider(MANAGED_PROVIDER), &managed_root)
            .with_external_provider(provider(EXTERNAL_PROVIDER)),
    );
    let manager = WorkspaceManager::load(
        temp.path(),
        resolver.clone() as Arc<dyn WorkspaceStorageResolver>,
    )
    .await
    .unwrap();

    let snapshot = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "个人笔记".to_string())
        .await
        .unwrap();
    let id = snapshot.id;
    let directory_name = snapshot.storage.directory_name.clone().unwrap();
    let source_root = managed_root
        .join("workspaces")
        .join(directory_name.as_str());
    assert!(source_root.join(".lonanote/manifest.json").exists());
    assert!(source_root.join("README.md").exists());

    let same_name = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "个人笔记".to_string())
        .await
        .unwrap();
    assert_eq!(
        same_name.storage.directory_name.as_ref().unwrap().as_str(),
        "个人笔记-2"
    );
    manager.close_workspace(&same_name.id).await.unwrap();
    assert_eq!(
        manager
            .remove_workspace(&same_name.id, true)
            .await
            .unwrap()
            .file_cleanup,
        StorageCleanupStatus::Removed
    );

    let ordinary_external = temp.path().join("ordinary-external");
    std::fs::create_dir_all(&ordinary_external).unwrap();
    std::fs::write(ordinary_external.join("user-file.txt"), "keep").unwrap();
    let external_snapshot = manager
        .create_external_workspace(external_binding(&ordinary_external), "外部目录".to_string())
        .await
        .unwrap();
    assert_eq!(
        std::fs::read_to_string(ordinary_external.join("user-file.txt")).unwrap(),
        "keep"
    );
    manager
        .close_workspace(&external_snapshot.id)
        .await
        .unwrap();
    manager
        .remove_workspace(&external_snapshot.id, false)
        .await
        .unwrap();
    let attached = manager
        .attach_workspace(external_binding(&ordinary_external))
        .await
        .unwrap();
    assert_eq!(attached.id, external_snapshot.id);
    assert_eq!(
        manager
            .attach_workspace(external_binding(&ordinary_external))
            .await
            .unwrap()
            .id,
        external_snapshot.id
    );
    manager
        .remove_workspace(&external_snapshot.id, false)
        .await
        .unwrap();
    assert!(ordinary_external.exists());

    let mismatch_root = temp.path().join("mismatch-workspace");
    std::fs::create_dir_all(&mismatch_root).unwrap();
    let mismatch = manager
        .create_external_workspace(external_binding(&mismatch_root), "Mismatch".to_string())
        .await
        .unwrap();
    manager.close_workspace(&mismatch.id).await.unwrap();
    let manifest_path = mismatch_root.join(".lonanote/manifest.json");
    let original_manifest = std::fs::read(&manifest_path).unwrap();
    let mut mismatched_manifest: WorkspaceManifest =
        serde_json::from_slice(&original_manifest).unwrap();
    mismatched_manifest.id = WorkspaceId::new();
    std::fs::write(
        &manifest_path,
        serde_json::to_vec_pretty(&mismatched_manifest).unwrap(),
    )
    .unwrap();
    assert!(matches!(
        manager.open_workspace(&mismatch.id).await.unwrap_err(),
        WorkspaceError::WorkspaceIdMismatch { expected, .. } if expected == mismatch.id
    ));
    assert!(!manager.is_workspace_open(&mismatch.id).await);
    assert!(
        manager
            .list_workspaces()
            .await
            .iter()
            .any(|workspace| workspace.id == mismatch.id),
        "打开失败不能删除 Catalog record"
    );
    std::fs::write(&manifest_path, original_manifest).unwrap();
    manager.open_workspace(&mismatch.id).await.unwrap();
    manager.close_workspace(&mismatch.id).await.unwrap();
    manager.remove_workspace(&mismatch.id, true).await.unwrap();

    let note = WorkspaceRelativePath::parse("notes/today.md").unwrap();
    manager
        .write_text(&id, &note, "today", WriteOptions::default())
        .await
        .unwrap();
    assert_eq!(manager.read_text(&id, &note).await.unwrap(), "today");
    assert_eq!(
        manager.file_metadata(&id, &note).await.unwrap().size,
        Some(5)
    );

    let binary = WorkspaceRelativePath::parse("notes/binary.bin").unwrap();
    manager
        .write_bytes(&id, &binary, &[0xff, 0xfe], WriteOptions::default())
        .await
        .unwrap();
    assert_eq!(
        manager.read_bytes(&id, &binary).await.unwrap(),
        [0xff, 0xfe]
    );
    assert!(matches!(
        manager.read_text(&id, &binary).await.unwrap_err(),
        WorkspaceError::Utf8(_)
    ));

    let drafts = WorkspaceRelativePath::parse("drafts").unwrap();
    let draft = WorkspaceRelativePath::parse("drafts/a.md").unwrap();
    let renamed_draft = WorkspaceRelativePath::parse("drafts/b.md").unwrap();
    manager.create_directory(&id, &drafts).await.unwrap();
    manager
        .write_text(&id, &draft, "draft", WriteOptions::default())
        .await
        .unwrap();
    manager.rename(&id, &draft, &renamed_draft).await.unwrap();
    assert!(manager.file_exists(&id, &renamed_draft).await.unwrap());
    manager.remove(&id, &drafts, true).await.unwrap();
    assert!(!manager.file_exists(&id, &drafts).await.unwrap());

    let internal = WorkspaceRelativePath::parse(".lonanote/manifest.json").unwrap();
    assert!(matches!(
        manager
            .write_text(&id, &internal, "{}", WriteOptions::default())
            .await
            .unwrap_err(),
        WorkspaceError::Storage(StorageError::UnsupportedOperation { .. })
    ));

    let tree = manager.get_tree(&id, true).await.unwrap();
    let root_node = tree.root.unwrap();
    assert!(root_node
        .children
        .as_ref()
        .unwrap()
        .iter()
        .all(|node| node.path.as_str() != ".lonanote"));
    let note_node = manager.get_node(&id, &note, false).await.unwrap();
    assert_eq!(note_node.path.as_str(), "notes/today.md");
    let notes = WorkspaceRelativePath::parse("notes").unwrap();
    let notes_node = manager.get_node(&id, &notes, true).await.unwrap();
    assert!(notes_node
        .children
        .as_ref()
        .unwrap()
        .iter()
        .any(|node| node.path.as_str() == "notes/today.md"));
    manager.refresh_index(&id).await.unwrap();

    let mut settings = manager.get_settings(&id).await.unwrap();
    settings.history_snapshot_count = 45;
    manager.set_settings(&id, settings.clone()).await.unwrap();
    assert_eq!(
        manager
            .get_settings(&id)
            .await
            .unwrap()
            .history_snapshot_count,
        45
    );
    let renamed_snapshot = manager
        .update_display_name(&id, "新名字".to_string())
        .await
        .unwrap();
    assert_eq!(renamed_snapshot.display_name, "新名字");
    assert!(source_root.exists(), "修改 display name 不得重命名目录");

    assert!(matches!(
        manager.remove_workspace(&id, false).await.unwrap_err(),
        WorkspaceError::CannotModifyOpenWorkspace(workspace_id) if workspace_id == id
    ));
    manager.close_workspace(&id).await.unwrap();
    assert!(matches!(
        manager.read_text(&id, &note).await.unwrap_err(),
        WorkspaceError::NotOpen(workspace_id) if workspace_id == id
    ));

    let reopened = manager.open_workspace(&id).await.unwrap();
    assert_eq!(reopened.id, id);
    assert_eq!(reopened.display_name, "新名字");
    assert_eq!(reopened.settings.history_snapshot_count, 45);
    assert_eq!(manager.read_text(&id, &note).await.unwrap(), "today");
    manager.close_workspace(&id).await.unwrap();

    assert!(matches!(
        manager
            .relocate_workspace(
                &id,
                WorkspaceStorageTarget::Managed {
                    provider_id: provider(MANAGED_PROVIDER),
                    preferred_directory_name: directory_name.clone(),
                },
            )
            .await
            .unwrap_err(),
        WorkspaceError::SameStorageBinding
    ));

    std::fs::write(external_target.join("occupied.txt"), "occupied").unwrap();
    assert!(matches!(
        manager
            .relocate_workspace(
                &id,
                WorkspaceStorageTarget::External {
                    binding: external_binding(&external_target),
                },
            )
            .await
            .unwrap_err(),
        WorkspaceError::TargetNotEmpty
    ));
    manager.open_workspace(&id).await.unwrap();
    assert_eq!(manager.read_text(&id, &note).await.unwrap(), "today");
    manager.close_workspace(&id).await.unwrap();
    std::fs::remove_file(external_target.join("occupied.txt")).unwrap();

    let target_binding = external_binding(&external_target);
    let relocated = manager
        .relocate_workspace(
            &id,
            WorkspaceStorageTarget::External {
                binding: target_binding.clone(),
            },
        )
        .await
        .unwrap();
    assert_eq!(relocated.source_cleanup, StorageCleanupStatus::Retained);
    assert!(source_root.join("notes/today.md").exists());
    assert!(external_target.join("notes/today.md").exists());

    assert!(matches!(
        manager
            .attach_workspace(WorkspaceStorageBinding::External {
                provider_id: provider(EXTERNAL_PROVIDER),
                resource_ref: source_root.to_string_lossy().into_owned(),
            })
            .await
            .unwrap_err(),
        WorkspaceError::DuplicateWorkspaceId(workspace_id) if workspace_id == id
    ));

    manager.open_workspace(&id).await.unwrap();
    assert_eq!(manager.read_text(&id, &note).await.unwrap(), "today");
    manager.close_workspace(&id).await.unwrap();
    let removed = manager.remove_workspace(&id, true).await.unwrap();
    assert_eq!(removed.file_cleanup, StorageCleanupStatus::Removed);
    assert!(!external_target.exists());
    assert!(source_root.exists(), "relocate 后源副本必须保留");

    let cleanup_failure = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "清理失败".to_string())
        .await
        .unwrap();
    let cleanup_root = managed_root.join("workspaces").join(
        cleanup_failure
            .storage
            .directory_name
            .as_ref()
            .unwrap()
            .as_str(),
    );
    manager.close_workspace(&cleanup_failure.id).await.unwrap();
    std::fs::remove_dir_all(cleanup_root).unwrap();
    let cleanup_result = manager
        .remove_workspace(&cleanup_failure.id, true)
        .await
        .unwrap();
    assert!(matches!(
        cleanup_result.file_cleanup,
        StorageCleanupStatus::Failed { .. }
    ));
    assert!(
        !manager
            .list_workspaces()
            .await
            .iter()
            .any(|workspace| workspace.id == cleanup_failure.id),
        "清理失败也不能恢复已经提交删除的 Catalog record"
    );

    verify_instance_mutation_locks().await;
}

#[tokio::test]
async fn fresh_layout_ignores_v1_files_and_separates_local_state() {
    let temp = TempDir::new().unwrap();
    let data_directory = temp.path().join("data");
    std::fs::create_dir_all(&data_directory).unwrap();
    let workspace_root = temp.path().join("Legacy Workspace");
    std::fs::create_dir_all(workspace_root.join(".lonanote")).unwrap();
    std::fs::write(workspace_root.join("note.md"), "legacy").unwrap();
    let legacy_workspace_settings = serde_json::to_vec_pretty(&json!({
        "createTime": 100,
        "fileTreeSortType": "name",
        "followGitignore": true,
        "histroySnapshootCount": 31
    }))
    .unwrap();
    std::fs::write(
        workspace_root.join(".lonanote/workspace.json"),
        &legacy_workspace_settings,
    )
    .unwrap();
    let path = workspace_root.to_string_lossy().into_owned();
    std::fs::write(
        data_directory.join("workspaces.json"),
        serde_json::to_vec_pretty(&json!({
            "lastWorkspace": path,
            "workspaces": [{
                "path": path,
                "rootPath": temp.path().to_string_lossy(),
                "name": "Legacy Workspace",
                "createTime": 100,
                "updateTime": 200
            }],
            "workspacesSavedata": {
                path.clone(): {
                    "lastOpenFilePath": "note.md"
                }
            }
        }))
        .unwrap(),
    )
    .unwrap();
    let orphan_id = WorkspaceId::new();
    std::fs::write(
        data_directory.join("workspace-local-state.json"),
        serde_json::to_vec_pretty(&json!({
            "schemaVersion": 1,
            "lastWorkspaceId": orphan_id,
            "workspaces": {
                orphan_id.to_string(): {
                    "lastOpenedAt": 123,
                    "lastOpenFile": "orphan.md"
                }
            }
        }))
        .unwrap(),
    )
    .unwrap();

    let resolver =
        Arc::new(LocalFsResolver::new().with_external_provider(provider(EXTERNAL_PROVIDER)));
    let manager = WorkspaceManager::load(
        &data_directory,
        resolver.clone() as Arc<dyn WorkspaceStorageResolver>,
    )
    .await
    .unwrap();
    assert!(
        manager.list_workspaces().await.is_empty(),
        "旧 workspaces.json 必须被完全忽略"
    );
    assert_eq!(manager.get_last_workspace_id().await, None);
    let reconciled_state: serde_json::Value = serde_json::from_slice(
        &std::fs::read(data_directory.join("workspace-local-state.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(reconciled_state["workspaces"], json!({}));
    assert!(!data_directory.join("workspaces.v1.backup.json").exists());

    let created = manager
        .create_external_workspace(
            external_binding(&workspace_root),
            "全新 Workspace".to_string(),
        )
        .await
        .unwrap();
    let id = created.id;
    assert_eq!(manager.get_last_workspace_id().await, Some(id));
    let manifest: WorkspaceManifest = serde_json::from_slice(
        &std::fs::read(workspace_root.join(".lonanote/manifest.json")).unwrap(),
    )
    .unwrap();
    assert_eq!(manifest.id, id);
    assert_eq!(manifest.schema_version, 1);
    assert_eq!(
        std::fs::read(workspace_root.join(".lonanote/workspace.json")).unwrap(),
        legacy_workspace_settings,
        "旧 workspace.json 不读取也不改写"
    );

    let catalog_path = data_directory.join("workspace-catalog.json");
    let state_path = data_directory.join("workspace-local-state.json");
    let catalog_before_local_state_change = std::fs::read(&catalog_path).unwrap();
    manager
        .set_last_open_file(&id, Some(WorkspaceRelativePath::parse("note.md").unwrap()))
        .await
        .unwrap();
    assert_eq!(
        std::fs::read(&catalog_path).unwrap(),
        catalog_before_local_state_change,
        "修改本机状态不能重写 Catalog"
    );
    assert!(data_directory
        .join("workspace-local-state.json.bak")
        .exists());

    let catalog_json: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&catalog_path).unwrap()).unwrap();
    let state_json: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&state_path).unwrap()).unwrap();
    assert_eq!(catalog_json["schemaVersion"], 1);
    assert!(catalog_json.get("lastWorkspaceId").is_none());
    assert!(!catalog_json.to_string().contains("lastOpen"));
    assert_eq!(state_json["schemaVersion"], 1);
    assert_eq!(state_json["lastWorkspaceId"], id.to_string());
    assert!(state_json.to_string().contains("lastOpenedAt"));
    assert!(state_json.to_string().contains("lastOpenFile"));

    std::fs::write(&state_path, b"{corrupted").unwrap();
    let reloaded = WorkspaceManager::load(
        &data_directory,
        resolver as Arc<dyn WorkspaceStorageResolver>,
    )
    .await
    .unwrap();
    assert_eq!(reloaded.list_workspaces().await[0].id, id);
    assert_eq!(reloaded.get_last_workspace_id().await, Some(id));
}

#[test]
fn cmdreg_exposes_new_workspace_api_and_runs_end_to_end() {
    let temp = TempDir::new().unwrap();
    let managed_root = temp.path().join("managed");
    let resolver = Arc::new(
        LocalFsResolver::new()
            .with_managed_provider(provider(MANAGED_PROVIDER), &managed_root)
            .with_external_provider(provider(EXTERNAL_PROVIDER)),
    );
    let runtime = tokio::runtime::Runtime::new().unwrap();
    let manager = runtime
        .block_on(WorkspaceManager::load(
            temp.path(),
            resolver as Arc<dyn WorkspaceStorageResolver>,
        ))
        .unwrap();
    install_workspace_manager(manager).unwrap();
    init().unwrap();

    let actual = get_command_async_keys()
        .unwrap()
        .into_iter()
        .filter(|key| key.starts_with("workspace."))
        .collect::<BTreeSet<_>>();
    let expected = [
        "workspace.attach",
        "workspace.close",
        "workspace.create_external",
        "workspace.create_managed",
        "workspace.file.capabilities",
        "workspace.file.create_directory",
        "workspace.file.exists",
        "workspace.file.list",
        "workspace.file.metadata",
        "workspace.file.read_bytes",
        "workspace.file.read_text",
        "workspace.file.remove",
        "workspace.file.rename",
        "workspace.file.write_bytes",
        "workspace.file.write_text",
        "workspace.get",
        "workspace.get_last_workspace_id",
        "workspace.get_local_state",
        "workspace.get_settings",
        "workspace.index.get_node",
        "workspace.index.get_tree",
        "workspace.index.refresh",
        "workspace.is_open",
        "workspace.list",
        "workspace.open",
        "workspace.relocate",
        "workspace.remove",
        "workspace.set_last_open_file",
        "workspace.set_settings",
        "workspace.update_display_name",
    ]
    .into_iter()
    .map(String::from)
    .collect::<BTreeSet<_>>();
    assert_eq!(actual, expected);
    assert!(actual.iter().all(|key| {
        !key.contains(".registry.")
            && !key.contains(".runtime.")
            && !key.contains(".storage.")
            && !key.contains("_by_path")
    }));

    runtime.block_on(async {
        let created: WorkspaceSnapshot = invoke_json(
            "workspace.create_managed",
            json!({
                "providerId": MANAGED_PROVIDER,
                "displayName": "Command Workspace"
            }),
        )
        .await;
        let id = created.id;

        invoke_unit(
            "workspace.file.write_text",
            json!({
                "workspaceId": id,
                "path": "note.md",
                "text": "from command",
                "overwrite": true,
                "createParent": true
            }),
        )
        .await;
        let text: String = invoke_json(
            "workspace.file.read_text",
            json!({"workspaceId": id, "path": "note.md"}),
        )
        .await;
        assert_eq!(text, "from command");

        let list: Vec<serde_json::Value> = invoke_json("workspace.list", json!({})).await;
        assert_eq!(list.len(), 1);
        assert_eq!(list[0]["id"], id.to_string());
        assert_eq!(list[0]["displayName"], "Command Workspace");

        invoke_json::<serde_json::Value>(
            "workspace.set_last_open_file",
            json!({"workspaceId": id, "path": "note.md"}),
        )
        .await;
        invoke_unit("workspace.close", json!({"workspaceId": id})).await;
        let is_open: bool = invoke_json("workspace.is_open", json!({"workspaceId": id})).await;
        assert!(!is_open);
        let local_state: serde_json::Value =
            invoke_json("workspace.get_local_state", json!({"workspaceId": id})).await;
        assert_eq!(local_state["lastOpenFile"], "note.md");
        let removed: serde_json::Value = invoke_json(
            "workspace.remove",
            json!({"workspaceId": id, "deleteFiles": false}),
        )
        .await;
        assert_eq!(removed["removedRecord"]["id"], id.to_string());
        assert_eq!(removed["fileCleanup"]["status"], "retained");
    });
}

async fn verify_instance_mutation_locks() {
    let binding = WorkspaceStorageBinding::External {
        provider_id: provider("memory"),
        resource_ref: "test-memory".to_string(),
    };
    let first_controlled = Arc::new(ControlledStorage::paused());
    let first_session = Arc::new(WorkspaceStorageSession::new(first_controlled.clone()));
    let first = Arc::new(
        WorkspaceInstance::new(
            binding.clone(),
            first_session,
            WorkspaceManifest::new(WorkspaceId::new(), "A".to_string(), 1),
        )
        .await
        .unwrap(),
    );
    let path = WorkspaceRelativePath::parse("note.md").unwrap();

    let first_write = {
        let instance = Arc::clone(&first);
        let path = path.clone();
        tokio::spawn(async move {
            instance
                .write_text(&path, "first", WriteOptions::default())
                .await
        })
    };
    first_controlled.started.notified().await;
    let second_write = {
        let instance = Arc::clone(&first);
        let path = path.clone();
        tokio::spawn(async move {
            instance
                .write_text(&path, "second", WriteOptions::default())
                .await
        })
    };
    tokio::time::sleep(Duration::from_millis(50)).await;
    assert_eq!(
        first_controlled.entered.load(Ordering::SeqCst),
        1,
        "同一 Workspace 的第二次写不能绕过 mutation_lock"
    );
    first_controlled.release.notify_waiters();
    first_write.await.unwrap().unwrap();
    second_write.await.unwrap().unwrap();
    assert_eq!(first_controlled.entered.load(Ordering::SeqCst), 2);

    let paused = Arc::new(ControlledStorage::paused());
    let active = Arc::new(ControlledStorage::active());
    let paused_instance = Arc::new(
        WorkspaceInstance::new(
            binding.clone(),
            Arc::new(WorkspaceStorageSession::new(paused.clone())),
            WorkspaceManifest::new(WorkspaceId::new(), "Paused".to_string(), 1),
        )
        .await
        .unwrap(),
    );
    let active_instance = Arc::new(
        WorkspaceInstance::new(
            binding,
            Arc::new(WorkspaceStorageSession::new(active)),
            WorkspaceManifest::new(WorkspaceId::new(), "Active".to_string(), 1),
        )
        .await
        .unwrap(),
    );
    let blocked = {
        let instance = paused_instance;
        let path = path.clone();
        tokio::spawn(async move {
            instance
                .write_text(&path, "blocked", WriteOptions::default())
                .await
        })
    };
    paused.started.notified().await;
    tokio::time::timeout(
        Duration::from_millis(300),
        active_instance.write_text(&path, "independent", WriteOptions::default()),
    )
    .await
    .expect("不同 Workspace 的写入不能被共享锁阻塞")
    .unwrap();
    paused.release.notify_waiters();
    blocked.await.unwrap().unwrap();

    let runtime = WorkspaceRuntime::new();
    let id = first.id;
    runtime.insert(id, Arc::clone(&first)).await.unwrap();
    let cloned = runtime.get(&id).await.unwrap();
    runtime.remove(&id).await;
    cloned
        .write_text(&path, "after-close", WriteOptions::default())
        .await
        .unwrap();
}

#[derive(Debug)]
struct ControlledStorage {
    inner: MemoryStorage,
    entered: AtomicUsize,
    pause_first: bool,
    started: Notify,
    release: Notify,
}

impl ControlledStorage {
    fn paused() -> Self {
        Self {
            inner: MemoryStorage::new(),
            entered: AtomicUsize::new(0),
            pause_first: true,
            started: Notify::new(),
            release: Notify::new(),
        }
    }

    fn active() -> Self {
        Self {
            pause_first: false,
            ..Self::paused()
        }
    }
}

#[async_trait]
impl WorkspaceStorage for ControlledStorage {
    async fn capabilities(&self) -> Result<StorageCapabilities, StorageError> {
        self.inner.capabilities().await
    }

    async fn exists(&self, path: &WorkspaceRelativePath) -> Result<bool, StorageError> {
        self.inner.exists(path).await
    }

    async fn metadata(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<StorageEntryMetadata, StorageError> {
        self.inner.metadata(path).await
    }

    async fn list_dir(
        &self,
        path: &WorkspaceRelativePath,
    ) -> Result<Vec<StorageEntry>, StorageError> {
        self.inner.list_dir(path).await
    }

    async fn read(&self, path: &WorkspaceRelativePath) -> Result<Vec<u8>, StorageError> {
        self.inner.read(path).await
    }

    async fn write(
        &self,
        path: &WorkspaceRelativePath,
        data: &[u8],
        options: WriteOptions,
    ) -> Result<(), StorageError> {
        let entered = self.entered.fetch_add(1, Ordering::SeqCst);
        if self.pause_first && entered == 0 {
            self.started.notify_one();
            self.release.notified().await;
        }
        self.inner.write(path, data, options).await
    }

    async fn create_dir_all(&self, path: &WorkspaceRelativePath) -> Result<(), StorageError> {
        self.inner.create_dir_all(path).await
    }

    async fn rename(
        &self,
        from: &WorkspaceRelativePath,
        to: &WorkspaceRelativePath,
    ) -> Result<(), StorageError> {
        self.inner.rename(from, to).await
    }

    async fn remove(
        &self,
        path: &WorkspaceRelativePath,
        recursive: bool,
    ) -> Result<(), StorageError> {
        self.inner.remove(path, recursive).await
    }
}

fn provider(value: &str) -> StorageProviderId {
    StorageProviderId::parse(value).unwrap()
}

fn external_binding(path: impl AsRef<std::path::Path>) -> WorkspaceStorageBinding {
    WorkspaceStorageBinding::External {
        provider_id: provider(EXTERNAL_PROVIDER),
        resource_ref: path.as_ref().to_string_lossy().into_owned(),
    }
}

fn test_record(name: &str, path: impl AsRef<std::path::Path>) -> WorkspaceRecord {
    let id = WorkspaceId::new();
    WorkspaceRecord {
        id,
        storage_binding: external_binding(path),
        cached_summary: WorkspaceCachedSummary {
            display_name: name.to_string(),
            created_at: Some(1),
            last_validated_at: Some(1),
        },
    }
}

async fn invoke_json<T: DeserializeOwned>(key: &str, args: serde_json::Value) -> T {
    let response = invoke_command_async(key, CommandContext::Value(&args))
        .await
        .unwrap();
    let json = response
        .into_option()
        .expect("command 必须返回 JSON response");
    serde_json::from_str(&json).unwrap()
}

async fn invoke_unit(key: &str, args: serde_json::Value) {
    let response = invoke_command_async(key, CommandContext::Value(&args))
        .await
        .unwrap();
    assert!(matches!(
        response.into_option().as_deref(),
        None | Some("null")
    ));
}

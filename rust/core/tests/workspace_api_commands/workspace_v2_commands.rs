use serde_json::{json, Value};

use super::support::{invoke_async_error, invoke_async_json, invoke_async_none, TestCommandEnv};

async fn register_local_mount(id: &str, name: &str, base_path: &std::path::Path) {
    std::fs::create_dir_all(base_path).expect("create selected mount directory");
    invoke_async_none(
        "workspace.storage.register_mount",
        Some(json!({
            "id": id,
            "displayName": name,
            "kind": {
                "kind": "desktopAbsolute",
                "basePath": base_path,
            },
            "createdTime": 1,
        })),
    )
    .await;
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_storage_mount_status_and_reauthorization_are_picker_independent() {
    let env = TestCommandEnv::new("workspace-v2-storage-status").await;
    let missing_path = env.path("missing");
    invoke_async_none(
        "workspace.storage.register_mount",
        Some(json!({
            "id": "selected-folder",
            "displayName": "Selected",
            "kind": {
                "kind": "desktopAbsolute",
                "basePath": missing_path,
            },
            "createdTime": 1,
        })),
    )
    .await;

    let missing_status = invoke_async_json::<Value>(
        "workspace.storage.get_mount_status",
        Some(json!({ "mountId": "selected-folder" })),
    )
    .await;
    assert_eq!(missing_status["availability"], "notFound");
    assert!(!env.path("missing").exists());

    let authorized_path = env.path("authorized");
    std::fs::create_dir_all(&authorized_path).expect("create authorized directory");
    let reauthorized = invoke_async_json::<Value>(
        "workspace.storage.reauthorize_mount",
        Some(json!({
            "mountId": "selected-folder",
            "kind": {
                "kind": "desktopAbsolute",
                "basePath": authorized_path,
            },
        })),
    )
    .await;
    assert_eq!(
        reauthorized["kind"]["basePath"],
        env.path("authorized").to_string_lossy().as_ref()
    );

    let available_status = invoke_async_json::<Value>(
        "workspace.storage.get_mount_status",
        Some(json!({ "mountId": "selected-folder" })),
    )
    .await;
    assert_eq!(available_status["availability"], "available");
    assert_eq!(available_status["capabilities"]["hasNativePath"], true);
    let statuses =
        invoke_async_json::<Vec<Value>>("workspace.storage.list_mount_statuses", None).await;
    assert!(statuses
        .iter()
        .any(|status| status["mountId"] == "selected-folder"
            && status["availability"] == "available"));

    let wrong_kind = invoke_async_error(
        "workspace.storage.reauthorize_mount",
        Some(json!({
            "mountId": "selected-folder",
            "kind": {
                "kind": "androidDocumentTree",
                "grantRef": "persisted-grant",
            },
        })),
    )
    .await;
    assert!(wrong_kind.contains("不能把 Storage mount"));

    let invalid_mount = invoke_async_error(
        "workspace.storage.register_mount",
        Some(json!({
            "id": "invalid-path",
            "displayName": "Invalid",
            "kind": {
                "kind": "desktopAbsolute",
                "basePath": " ",
            },
            "createdTime": 1,
        })),
    )
    .await;
    assert!(invalid_mount.contains("绝对路径不能为空"));
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_storage_scan_is_shallow_read_only_and_reports_conflicts() {
    let env = TestCommandEnv::new("workspace-v2-storage-scan").await;
    let mount_path = env.path("mount");
    register_local_mount("scan-mount", "Scan", &mount_path).await;

    let registered = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({
            "name": "registered",
            "mountId": "scan-mount",
            "parentPath": "workspaces",
        })),
    )
    .await;
    let registered_id = registered["id"].as_str().unwrap().to_string();

    let ready = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({
            "name": "ready",
            "mountId": "scan-mount",
            "parentPath": "workspaces",
        })),
    )
    .await;
    let ready_id = ready["id"].as_str().unwrap().to_string();
    invoke_async_json::<Value>(
        "workspace.registry.remove_workspace",
        Some(json!({
            "workspaceId": ready_id,
            "deleteFiles": false,
        })),
    )
    .await;

    let registered_manifest =
        std::fs::read(mount_path.join("workspaces/registered/.lonanote/workspace.json"))
            .expect("read registered manifest");
    let duplicate_dir = mount_path.join("workspaces/duplicate/.lonanote");
    std::fs::create_dir_all(&duplicate_dir).expect("create duplicate config directory");
    std::fs::write(duplicate_dir.join("workspace.json"), &registered_manifest)
        .expect("write duplicate manifest");

    std::fs::create_dir_all(mount_path.join("workspaces/missing"))
        .expect("create manifest-less directory");
    std::fs::create_dir_all(mount_path.join("workspaces/nested/not-scanned"))
        .expect("create nested directory");

    let unsupported_dir = mount_path.join("workspaces/unsupported/.lonanote");
    std::fs::create_dir_all(&unsupported_dir).expect("create unsupported config directory");
    let mut unsupported_manifest: Value =
        serde_json::from_slice(&registered_manifest).expect("parse registered manifest");
    unsupported_manifest["schemaVersion"] = json!(999);
    std::fs::write(
        unsupported_dir.join("workspace.json"),
        serde_json::to_vec_pretty(&unsupported_manifest).expect("serialize unsupported manifest"),
    )
    .expect("write unsupported manifest");

    let invalid_dir = mount_path.join("workspaces/invalid/.lonanote");
    std::fs::create_dir_all(&invalid_dir).expect("create invalid config directory");
    std::fs::write(invalid_dir.join("workspace.json"), b"{broken").expect("write invalid manifest");

    let scan = invoke_async_json::<Value>(
        "workspace.storage.scan_mount",
        Some(json!({
            "mountId": "scan-mount",
            "parentPath": "workspaces",
        })),
    )
    .await;
    assert_eq!(scan["mountId"], "scan-mount");
    assert_eq!(scan["parentPath"], "workspaces");
    let entries = scan["entries"].as_array().expect("scan entries");
    assert_eq!(entries.len(), 7);

    let find = |path: &str| {
        entries
            .iter()
            .find(|entry| entry["locator"]["relativePath"] == path)
            .unwrap_or_else(|| panic!("missing scan entry: {path}"))
    };
    assert_eq!(find("workspaces/ready")["status"], "ready");
    assert_eq!(find("workspaces/ready")["workspaceId"], ready_id);
    assert_eq!(find("workspaces/registered")["status"], "registered");
    assert_eq!(
        find("workspaces/duplicate")["status"],
        "duplicateWorkspaceId"
    );
    assert_eq!(
        find("workspaces/duplicate")["registeredLocator"]["relativePath"],
        "workspaces/registered"
    );
    assert_eq!(find("workspaces/missing")["status"], "manifestMissing");
    assert_eq!(find("workspaces/nested")["status"], "manifestMissing");
    assert!(entries
        .iter()
        .all(|entry| entry["locator"]["relativePath"] != "workspaces/nested/not-scanned"));
    assert_eq!(
        find("workspaces/unsupported")["status"],
        "unsupportedManifestSchema"
    );
    assert_eq!(find("workspaces/invalid")["status"], "invalid");
    assert_eq!(find("workspaces/duplicate")["workspaceId"], registered_id);

    let attached = invoke_async_json::<Value>(
        "workspace.registry.attach_workspace",
        Some(json!({
            "mountId": "scan-mount",
            "workspacePath": "workspaces/ready",
            "initializeIfMissing": false,
        })),
    )
    .await;
    assert_eq!(attached["id"], ready_id);
}

#[tokio::test(flavor = "current_thread")]
async fn unavailable_or_mismatched_workspace_remains_in_registry() {
    let env = TestCommandEnv::new("workspace-v2-unavailable").await;
    let mount_path = env.path("mount");
    register_local_mount("status-mount", "Status", &mount_path).await;
    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({
            "name": "status-workspace",
            "mountId": "status-mount",
            "parentPath": "workspaces",
        })),
    )
    .await;
    let workspace_id = record["id"].as_str().unwrap().to_string();

    let available = invoke_async_json::<Value>(
        "workspace.registry.get_workspace_status",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;
    assert_eq!(available["availability"], "available");

    let manifest_path = mount_path.join("workspaces/status-workspace/.lonanote/workspace.json");
    let mut manifest: Value =
        serde_json::from_slice(&std::fs::read(&manifest_path).expect("read manifest"))
            .expect("parse manifest");
    manifest["id"] = json!(uuid::Uuid::new_v4().hyphenated().to_string());
    std::fs::write(
        &manifest_path,
        serde_json::to_vec_pretty(&manifest).expect("serialize manifest"),
    )
    .expect("write mismatched manifest");

    let mismatched = invoke_async_json::<Value>(
        "workspace.registry.get_workspace_status",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;
    assert_eq!(mismatched["availability"], "workspaceIdMismatch");

    std::fs::remove_dir_all(&mount_path).expect("remove mount directory");
    let unavailable = invoke_async_json::<Value>(
        "workspace.registry.get_workspace_status",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;
    assert_eq!(unavailable["availability"], "mountUnavailable");
    assert_eq!(unavailable["mountStatus"]["availability"], "notFound");

    let records =
        invoke_async_json::<Vec<Value>>("workspace.registry.list_workspace_records", None).await;
    assert!(records.iter().any(|record| record["id"] == workspace_id));
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_v2_registry_and_runtime_roundtrip() {
    let env = TestCommandEnv::new("workspace-v2-api").await;
    register_local_mount("test-source", "Source", &env.path("source")).await;
    register_local_mount("test-destination", "Destination", &env.path("destination")).await;

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({
            "name": "alpha",
            "mountId": "test-source",
            "parentPath": "workspaces",
        })),
    )
    .await;
    let workspace_id = record["id"].as_str().expect("workspace id").to_string();
    assert_eq!(record["name"], "alpha");
    assert_eq!(record["locator"]["mountId"], "test-source");
    assert_eq!(record["locator"]["relativePath"], "workspaces/alpha");
    assert!(env
        .path("source/workspaces/alpha/.lonanote/workspace.json")
        .exists());

    let opened = invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;
    assert_eq!(opened["record"]["id"], workspace_id);
    assert_eq!(opened["runtimeStatus"], "opened");
    let state = invoke_async_json::<Value>(
        "workspace.runtime.get_workspace_state",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;
    assert_eq!(state["record"]["id"], workspace_id);

    invoke_async_none(
        "workspace.file.write_text",
        Some(json!({
            "workspaceId": workspace_id,
            "path": "notes/today.md",
            "text": "hello",
        })),
    )
    .await;
    let text = invoke_async_json::<String>(
        "workspace.file.read_text",
        Some(json!({
            "workspaceId": workspace_id,
            "path": "notes/today.md",
        })),
    )
    .await;
    assert_eq!(text, "hello");
    let entries = invoke_async_json::<Vec<Value>>(
        "workspace.file.list_directory",
        Some(json!({
            "workspaceId": workspace_id,
            "path": "notes",
        })),
    )
    .await;
    assert_eq!(entries[0]["path"], "notes/today.md");

    invoke_async_none(
        "workspace.file.write_text",
        Some(json!({
            "workspaceId": workspace_id,
            "path": ".gitignore",
            "text": "ignored.md\n",
        })),
    )
    .await;
    invoke_async_none(
        "workspace.file.write_text",
        Some(json!({
            "workspaceId": workspace_id,
            "path": "ignored.md",
            "text": "hidden",
        })),
    )
    .await;
    invoke_async_none(
        "workspace.file.write_text",
        Some(json!({
            "workspaceId": workspace_id,
            "path": "visible.md",
            "text": "visible",
        })),
    )
    .await;

    let shallow_tree = invoke_async_json::<Value>(
        "workspace.runtime.get_file_tree",
        Some(json!({
            "workspaceId": workspace_id,
            "recursive": false,
        })),
    )
    .await;
    assert_eq!(shallow_tree["recursive"], false);
    let root_children = shallow_tree["root"]["children"]
        .as_array()
        .expect("root children");
    assert!(root_children
        .iter()
        .any(|node| node["path"] == "visible.md"));
    assert!(!root_children
        .iter()
        .any(|node| node["path"] == "ignored.md"));
    assert!(!root_children.iter().any(|node| node["path"] == ".lonanote"));

    let notes_node = invoke_async_json::<Value>(
        "workspace.runtime.get_file_node",
        Some(json!({
            "workspaceId": workspace_id,
            "path": "notes",
            "recursive": false,
        })),
    )
    .await;
    assert_eq!(notes_node["path"], "notes");
    assert_eq!(notes_node["children"][0]["path"], "notes/today.md");

    let capabilities = invoke_async_json::<Value>(
        "workspace.file.capabilities",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;
    assert_eq!(capabilities["canRead"], true);
    assert_eq!(capabilities["canMove"], true);
    assert_eq!(capabilities["hasNativePath"], true);

    invoke_async_none(
        "workspace.file.create_directory",
        Some(json!({
            "workspaceId": workspace_id,
            "path": "archive",
        })),
    )
    .await;
    let rename_across_directories = invoke_async_error(
        "workspace.file.rename",
        Some(json!({
            "workspaceId": workspace_id,
            "fromPath": "notes/today.md",
            "toPath": "archive/today.md",
        })),
    )
    .await;
    assert!(rename_across_directories.contains("workspace.file.move"));

    invoke_async_none(
        "workspace.file.rename",
        Some(json!({
            "workspaceId": workspace_id,
            "fromPath": "notes/today.md",
            "toPath": "notes/renamed.md",
        })),
    )
    .await;
    invoke_async_none(
        "workspace.file.move",
        Some(json!({
            "workspaceId": workspace_id,
            "fromPath": "notes/renamed.md",
            "toPath": "archive/renamed.md",
        })),
    )
    .await;
    let moved_text = invoke_async_json::<String>(
        "workspace.file.read_text",
        Some(json!({
            "workspaceId": workspace_id,
            "path": "archive/renamed.md",
        })),
    )
    .await;
    assert_eq!(moved_text, "hello");

    let tree_after_move = invoke_async_json::<Value>(
        "workspace.runtime.get_file_tree",
        Some(json!({
            "workspaceId": workspace_id,
            "recursive": false,
        })),
    )
    .await;
    assert!(tree_after_move["root"]["children"]
        .as_array()
        .expect("root children after move")
        .iter()
        .any(|node| node["path"] == "archive"));
    invoke_async_none(
        "workspace.runtime.refresh_workspace",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;

    let invalid_tree_path = invoke_async_error(
        "workspace.runtime.get_file_node",
        Some(json!({
            "workspaceId": workspace_id,
            "path": "/outside.md",
            "recursive": false,
        })),
    )
    .await;
    assert!(invalid_tree_path.contains("不能以 / 开头"));

    let rename_error = invoke_async_error(
        "workspace.registry.rename_workspace",
        Some(json!({
            "workspaceId": workspace_id,
            "newName": "blocked",
        })),
    )
    .await;
    assert!(rename_error.contains("已打开"));

    invoke_async_none(
        "workspace.runtime.close_workspace",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;

    let renamed = invoke_async_json::<Value>(
        "workspace.registry.rename_workspace",
        Some(json!({
            "workspaceId": workspace_id,
            "newName": "beta",
        })),
    )
    .await;
    assert_eq!(renamed["name"], "beta");
    assert!(env.path("source/workspaces/beta").exists());

    let moved = invoke_async_json::<Value>(
        "workspace.registry.move_workspace",
        Some(json!({
            "workspaceId": workspace_id,
            "destinationMountId": "test-destination",
            "destinationParentPath": "vaults",
            "deleteSourceAfterCommit": true,
        })),
    )
    .await;
    assert_eq!(moved["record"]["locator"]["mountId"], "test-destination");
    assert_eq!(moved["record"]["locator"]["relativePath"], "vaults/beta");
    assert_eq!(moved["sourceCleanup"]["status"], "removed");
    assert!(!env.path("source/workspaces/beta").exists());
    assert!(env.path("destination/vaults/beta").exists());

    let removed = invoke_async_json::<Value>(
        "workspace.registry.remove_workspace",
        Some(json!({
            "workspaceId": workspace_id,
            "deleteFiles": true,
        })),
    )
    .await;
    assert_eq!(removed["fileCleanup"]["status"], "removed");
    assert!(!env.path("destination/vaults/beta").exists());
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_v2_attach_requires_explicit_initialization() {
    let env = TestCommandEnv::new("workspace-v2-attach-api").await;
    register_local_mount("test-attach", "Attach", &env.path("attach")).await;
    std::fs::create_dir_all(env.path("attach/existing")).expect("create existing directory");

    let args = json!({
        "mountId": "test-attach",
        "workspacePath": "existing",
        "initializeIfMissing": false,
    });
    let error = invoke_async_error("workspace.registry.attach_workspace", Some(args)).await;
    assert!(error.contains("manifest 不存在"));

    let attached = invoke_async_json::<Value>(
        "workspace.registry.attach_workspace",
        Some(json!({
            "mountId": "test-attach",
            "workspacePath": "existing",
            "initializeIfMissing": true,
        })),
    )
    .await;
    assert_eq!(attached["name"], "existing");
    assert!(env
        .path("attach/existing/.lonanote/workspace.json")
        .exists());
}

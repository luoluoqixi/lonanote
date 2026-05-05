use serde_json::{json, Value};

use super::support::{
    create_external_workspace, invoke_async_error, invoke_async_json, invoke_async_none,
    json_field, TestCommandEnv,
};

#[tokio::test(flavor = "current_thread")]
async fn workspace_registry_commands_roundtrip() {
    let env = TestCommandEnv::new("registry-api").await;
    let workspace_dir = env.path("projects/alpha");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;

    let workspace_id = record["metadata"]["id"]
        .as_str()
        .expect("workspace id")
        .to_string();
    assert_eq!(record["metadata"]["name"], "alpha");
    assert_eq!(record["saveData"]["id"], workspace_id);
    assert!(env.path("projects/alpha/.lonanote/workspace.json").exists());

    let records =
        invoke_async_json::<Vec<Value>>("workspace.registry.list_workspace_records", None).await;
    assert_eq!(records.len(), 1);

    let fetched = invoke_async_json::<Value>(
        "workspace.registry.get_workspace_record",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;
    assert_eq!(fetched["metadata"]["name"], "alpha");

    let exists = invoke_async_json::<bool>(
        "workspace.registry.check_workspace_path_exist",
        Some(json!({ "workspacePath": env.path("projects/alpha") })),
    )
    .await;
    assert!(exists);

    let legal = invoke_async_json::<bool>(
        "workspace.registry.check_workspace_path_legal",
        Some(json!({ "workspacePath": String::from("/tmp/example") })),
    )
    .await;
    assert!(legal);

    invoke_async_none(
        "workspace.registry.set_workspace_savedata",
        Some(json!({
            "workspaceId": workspace_id,
            "data": {
                "id": "",
                "lastOpenFilePath": "notes/guide.md"
            }
        })),
    )
    .await;

    let savedata = invoke_async_json::<Value>(
        "workspace.registry.get_workspace_savedata",
        Some(json!({ "workspaceId": fetched["metadata"]["id"] })),
    )
    .await;
    assert_eq!(savedata["id"], fetched["metadata"]["id"]);
    assert_eq!(savedata["lastOpenFilePath"], "notes/guide.md");
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_registry_mutation_commands_roundtrip() {
    let env = TestCommandEnv::new("registry-mutation-api").await;
    let workspace_dir = env.path("projects/alpha");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;
    let workspace_id = record["metadata"]["id"].clone();

    let renamed = invoke_async_json::<Value>(
        "workspace.registry.rename_workspace",
        Some(json!({
            "workspaceId": workspace_id,
            "newName": "beta",
            "isMove": true
        })),
    )
    .await;
    assert_eq!(renamed["metadata"]["name"], "beta");
    assert!(env.path("projects/beta").exists());

    let moved_path = env.path("archives/gamma");
    let moved = invoke_async_json::<Value>(
        "workspace.registry.move_workspace",
        Some(json!({
            "workspaceId": renamed["metadata"]["id"],
            "newPath": moved_path,
            "isMove": true
        })),
    )
    .await;
    assert_eq!(moved["metadata"]["name"], "gamma");
    assert!(env.path("archives/gamma").exists());

    invoke_async_none(
        "workspace.registry.remove_workspace",
        Some(json!({
            "workspaceId": moved["metadata"]["id"],
            "deleteFile": false
        })),
    )
    .await;

    assert!(env.path("archives/gamma").exists());
    let records =
        invoke_async_json::<Vec<Value>>("workspace.registry.list_workspace_records", None).await;
    assert!(records.is_empty());
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_registry_init_setup_and_last_workspace_id_behaviour() {
    let env = TestCommandEnv::new("registry-init-setup-api").await;
    let workspace_dir = env.path("bootstrap/default-workspace");

    invoke_async_none(
        "workspace.registry.init_setup",
        Some(json!({ "path": workspace_dir })),
    )
    .await;

    assert!(env.path("bootstrap/default-workspace/README.md").exists());
    assert!(env.path("bootstrap/default-workspace/README_en.md").exists());

    let last_workspace_id =
        invoke_async_json::<Option<String>>("workspace.registry.get_last_workspace_id", None).await;
    assert!(last_workspace_id.is_some());

    invoke_async_none(
        "settings.set_settings",
        Some(json!({
            "firstSetup": false,
            "autoCheckUpdate": true,
            "autoOpenLastWorkspace": false,
            "autoSave": true,
            "autoSaveInterval": 1.0,
            "autoSaveFocusChange": true,
            "showLineNumber": false,
            "disableLineWrap": false,
            "sourceMode": false
        })),
    )
    .await;

    let hidden_last_workspace_id =
        invoke_async_json::<Option<String>>("workspace.registry.get_last_workspace_id", None).await;
    assert!(hidden_last_workspace_id.is_none());
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_registry_roots_commands_roundtrip() {
    let env = TestCommandEnv::new("roots-api").await;
    let root_base = env.path("mobile-documents");
    let imported_workspace = root_base.join("workspaces/imported");
    create_external_workspace(&imported_workspace, true);

    let summary = invoke_async_json::<Value>(
        "workspace.registry.set_workspace_roots",
        Some(json!({
            "roots": [
                {
                    "key": "mobile-docs",
                    "path": root_base,
                    "kind": "mobileAppSandbox",
                    "source": { "kind": "systemDefault" }
                }
            ]
        })),
    )
    .await;
    assert_eq!(summary["importedCount"], 1);

    let roots =
        invoke_async_json::<Vec<Value>>("workspace.registry.get_workspace_roots_config", None)
            .await;
    assert_eq!(roots.len(), 1);
    assert!(roots[0]["path"]
        .as_str()
        .expect("root path")
        .ends_with("/mobile-documents/workspaces"));

    let created = invoke_async_json::<Value>(
        "workspace.registry.create_workspace_in_root",
        Some(json!({
            "rootKey": "mobile-docs",
            "name": "created"
        })),
    )
    .await;
    assert_eq!(created["locator"]["kind"], "managedRoot");
    assert_eq!(
        json_field(&created["locator"], &["rootKey", "root_key"]),
        Some("mobile-docs")
    );
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_registry_commands_reject_open_workspace_mutations() {
    let env = TestCommandEnv::new("open-guard-api").await;
    let workspace_dir = env.path("projects/guarded");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;
    let workspace_id = record["metadata"]["id"]
        .as_str()
        .expect("workspace id")
        .to_string();

    invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;

    let rename_error = invoke_async_error(
        "workspace.registry.rename_workspace",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "newName": "renamed",
            "isMove": true
        })),
    )
    .await;
    assert!(rename_error.contains("already existed open workspace"));

    let move_error = invoke_async_error(
        "workspace.registry.move_workspace",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "newPath": env.path("archives/renamed"),
            "isMove": true
        })),
    )
    .await;
    assert!(move_error.contains("already existed open workspace"));

    let remove_error = invoke_async_error(
        "workspace.registry.remove_workspace",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "deleteFile": true
        })),
    )
    .await;
    assert!(remove_error.contains("cannot remove an already open workspace"));
}

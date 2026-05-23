use std::{fs, thread, time::Duration};

use serde_json::{json, Value};

use super::support::{invoke_async_error, invoke_async_json, invoke_async_none, TestCommandEnv};

fn child_names(node: &Value) -> Vec<&str> {
    node["children"]
        .as_array()
        .expect("node children")
        .iter()
        .map(|child| child["path"].as_str().expect("child path"))
        .collect()
}

fn child_has_create_time(node: &Value) -> bool {
    node["children"]
        .as_array()
        .expect("node children")
        .iter()
        .all(|child| !child["createTime"].is_null())
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_commands_roundtrip() {
    let env = TestCommandEnv::new("runtime-api").await;
    let workspace_dir = env.path("projects/runtime");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;
    let workspace_id = record["metadata"]["id"]
        .as_str()
        .expect("workspace id")
        .to_string();

    fs::create_dir_all(env.path("projects/runtime/docs")).expect("create docs dir");
    fs::write(env.path("projects/runtime/README.md"), "# Runtime Test\n").expect("write readme");
    fs::write(env.path("projects/runtime/docs/guide.md"), "guide\n").expect("write guide");

    let open_state = invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;
    assert_eq!(
        open_state["record"]["metadata"]["id"],
        record["metadata"]["id"]
    );
    assert_eq!(open_state["runtimeStatus"], "opened");

    let is_open = invoke_async_json::<bool>(
        "workspace.runtime.is_workspace_open",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    assert!(is_open);

    let current_state = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    assert_eq!(
        current_state["record"]["metadata"]["path"],
        open_state["record"]["metadata"]["path"]
    );

    let file_tree = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_tree",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    assert_eq!(
        file_tree["path"],
        Value::String(env.path("projects/runtime").to_string_lossy().into_owned())
    );
    assert!(file_tree["root"].is_object());

    let root_node = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": null,
            "sortType": "name",
            "recursive": false
        })),
    )
    .await;
    let children = root_node["children"].as_array().expect("root children");
    assert!(children.iter().any(|child| child["path"] == "README.md"));
    assert!(children.iter().any(|child| child["path"] == "docs"));

    let nested_node = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": "docs",
            "sortType": "name",
            "recursive": true
        })),
    )
    .await;
    assert_eq!(nested_node["path"], "");
    assert!(nested_node["children"]
        .as_array()
        .expect("nested children")
        .iter()
        .any(|child| child["path"] == "guide.md"));

    invoke_async_none(
        "workspace.runtime.call_open_workspace_reinit",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;

    let last_workspace_id =
        invoke_async_json::<Option<String>>("workspace.registry.get_last_workspace_id", None).await;
    assert_eq!(
        last_workspace_id.as_deref(),
        record["metadata"]["id"].as_str()
    );

    invoke_async_none(
        "workspace.runtime.close_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;

    let is_open_after_close = invoke_async_json::<bool>(
        "workspace.runtime.is_workspace_open",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    assert!(!is_open_after_close);
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_import_init_and_open_state_errors() {
    let env = TestCommandEnv::new("runtime-import-api").await;
    let import_dir = env.path("imports/defaults");
    fs::create_dir_all(&import_dir).expect("create import dir");

    invoke_async_none(
        "workspace.runtime.import_init_workspace",
        Some(json!({ "path": import_dir })),
    )
    .await;

    assert!(env.path("imports/defaults/README.md").exists());
    assert!(env.path("imports/defaults/README_en.md").exists());

    let missing_error = invoke_async_error(
        "workspace.runtime.get_open_workspace",
        Some(json!({ "workspaceId": "missing-workspace" })),
    )
    .await;
    assert!(missing_error.contains("workspace is not open"));
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_open_workspace_reflects_settings_updates() {
    let env = TestCommandEnv::new("runtime-settings-api").await;
    let workspace_dir = env.path("projects/settings-bound");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;
    let workspace_id = record["metadata"]["id"].clone();

    invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": workspace_id })),
    )
    .await;

    let mut settings = invoke_async_json::<Value>(
        "workspace.registry.get_workspace_settings",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    settings["followGitignore"] = Value::Bool(false);
    settings["customIgnore"] = Value::String(String::from("dist\n.cache"));

    invoke_async_json::<Value>(
        "workspace.registry.set_workspace_settings",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "settings": settings,
        })),
    )
    .await;

    let current_state = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    assert_eq!(current_state["runtimeConfig"]["followGitignore"], false);
    assert_eq!(
        current_state["runtimeConfig"]["customIgnore"],
        "dist\n.cache"
    );
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_file_tree_respects_follow_gitignore_updates() {
    let env = TestCommandEnv::new("runtime-follow-gitignore-api").await;
    let workspace_dir = env.path("projects/follow-gitignore");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;

    fs::write(
        env.path("projects/follow-gitignore/.gitignore"),
        "ignored.md\nignored-dir/\n",
    )
    .expect("write workspace gitignore");
    fs::write(
        env.path("projects/follow-gitignore/ignored.md"),
        "ignored\n",
    )
    .expect("write ignored file");
    fs::write(
        env.path("projects/follow-gitignore/visible.md"),
        "visible\n",
    )
    .expect("write visible file");
    fs::create_dir_all(env.path("projects/follow-gitignore/ignored-dir"))
        .expect("create ignored dir");
    fs::write(
        env.path("projects/follow-gitignore/ignored-dir/note.md"),
        "hidden\n",
    )
    .expect("write ignored nested file");

    invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;

    let hidden_by_gitignore = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_tree",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    let hidden_children = child_names(&hidden_by_gitignore["root"]);
    assert!(hidden_children.contains(&"visible.md"));
    assert!(!hidden_children.contains(&"ignored.md"));
    assert!(!hidden_children.contains(&"ignored-dir"));

    let mut settings = invoke_async_json::<Value>(
        "workspace.registry.get_workspace_settings",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    settings["followGitignore"] = Value::Bool(false);

    invoke_async_json::<Value>(
        "workspace.registry.set_workspace_settings",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "settings": settings,
        })),
    )
    .await;

    let visible_without_gitignore = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_tree",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    let visible_children = child_names(&visible_without_gitignore["root"]);
    assert!(visible_children.contains(&"visible.md"));
    assert!(visible_children.contains(&"ignored.md"));
    assert!(visible_children.contains(&"ignored-dir"));
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_file_tree_respects_custom_ignore_updates() {
    let env = TestCommandEnv::new("runtime-custom-ignore-api").await;
    let workspace_dir = env.path("projects/custom-ignore");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;

    fs::create_dir_all(env.path("projects/custom-ignore/drafts")).expect("create drafts dir");
    fs::write(
        env.path("projects/custom-ignore/drafts/guide.md"),
        "guide\n",
    )
    .expect("write drafts guide");
    fs::write(env.path("projects/custom-ignore/keep.md"), "keep\n").expect("write keep file");
    fs::write(env.path("projects/custom-ignore/temp.tmp"), "temp\n").expect("write temp file");

    invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;

    let initial_tree = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_tree",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    let initial_children = child_names(&initial_tree["root"]);
    assert!(initial_children.contains(&"drafts"));
    assert!(initial_children.contains(&"keep.md"));
    assert!(initial_children.contains(&"temp.tmp"));

    let mut settings = invoke_async_json::<Value>(
        "workspace.registry.get_workspace_settings",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    settings["customIgnore"] = Value::String(String::from("drafts/\n*.tmp"));

    invoke_async_json::<Value>(
        "workspace.registry.set_workspace_settings",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "settings": settings,
        })),
    )
    .await;

    let updated_tree = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_tree",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    let updated_children = child_names(&updated_tree["root"]);
    assert!(!updated_children.contains(&"drafts"));
    assert!(updated_children.contains(&"keep.md"));
    assert!(!updated_children.contains(&"temp.tmp"));
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_file_node_respects_recursive_flag() {
    let env = TestCommandEnv::new("runtime-file-tree-recursive-api").await;
    let workspace_dir = env.path("projects/recursive-tree");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;

    fs::create_dir_all(env.path("projects/recursive-tree/docs/deep")).expect("create nested dir");
    fs::write(env.path("projects/recursive-tree/docs/guide.md"), "guide\n").expect("write guide");
    fs::write(
        env.path("projects/recursive-tree/docs/deep/nested.md"),
        "nested\n",
    )
    .expect("write nested file");

    invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;

    let shallow_node = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": "docs",
            "sortType": "name",
            "recursive": false
        })),
    )
    .await;
    let shallow_children = shallow_node["children"]
        .as_array()
        .expect("shallow children");
    let deep_dir = shallow_children
        .iter()
        .find(|child| child["path"] == "deep")
        .expect("find deep dir");
    assert!(deep_dir["children"].is_null());
    assert!(shallow_children
        .iter()
        .any(|child| child["path"] == "guide.md"));

    let recursive_node = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": "docs",
            "sortType": "name",
            "recursive": true
        })),
    )
    .await;
    let recursive_children = recursive_node["children"]
        .as_array()
        .expect("recursive children");
    let recursive_deep_dir = recursive_children
        .iter()
        .find(|child| child["path"] == "deep")
        .expect("find recursive deep dir");
    assert!(recursive_deep_dir["children"]
        .as_array()
        .expect("deep dir children")
        .iter()
        .any(|child| child["path"] == "deep/nested.md"));
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_file_node_supports_sort_type_switching() {
    let env = TestCommandEnv::new("runtime-file-tree-sort-api").await;
    let workspace_dir = env.path("projects/sort-tree");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;

    for file_name in ["10.md", "2.md", "1.md"] {
        fs::write(
            env.path(format!("projects/sort-tree/{file_name}")),
            file_name,
        )
        .expect("write sort fixture");
    }

    invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;

    let name_sorted = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": null,
            "sortType": "name",
            "recursive": false
        })),
    )
    .await;
    assert_eq!(child_names(&name_sorted), vec!["1.md", "2.md", "10.md"]);

    let reverse_sorted = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": null,
            "sortType": "nameRev",
            "recursive": false
        })),
    )
    .await;
    assert_eq!(child_names(&reverse_sorted), vec!["10.md", "2.md", "1.md"]);
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_file_node_supports_time_sort_types() {
    let env = TestCommandEnv::new("runtime-file-tree-time-sort-api").await;
    let workspace_dir = env.path("projects/time-sort-tree");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;

    fs::write(env.path("projects/time-sort-tree/alpha.md"), "alpha-1\n").expect("write alpha");
    thread::sleep(Duration::from_millis(1100));

    fs::write(env.path("projects/time-sort-tree/beta.md"), "beta\n").expect("write beta");
    thread::sleep(Duration::from_millis(1100));

    fs::write(env.path("projects/time-sort-tree/gamma.md"), "gamma\n").expect("write gamma");
    thread::sleep(Duration::from_millis(1100));

    fs::write(env.path("projects/time-sort-tree/alpha.md"), "alpha-2\n").expect("rewrite alpha");

    invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;

    let modified_sorted = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": null,
            "sortType": "lastModifiedTime",
            "recursive": false
        })),
    )
    .await;
    assert_eq!(
        child_names(&modified_sorted),
        vec!["alpha.md", "gamma.md", "beta.md"]
    );

    let modified_reverse_sorted = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": null,
            "sortType": "lastModifiedTimeRev",
            "recursive": false
        })),
    )
    .await;
    assert_eq!(
        child_names(&modified_reverse_sorted),
        vec!["beta.md", "gamma.md", "alpha.md"]
    );

    let created_sorted = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": null,
            "sortType": "createTime",
            "recursive": false
        })),
    )
    .await;
    if child_has_create_time(&created_sorted) {
        assert_eq!(
            child_names(&created_sorted),
            vec!["gamma.md", "beta.md", "alpha.md"]
        );
    }

    let created_reverse_sorted = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": null,
            "sortType": "createTimeRev",
            "recursive": false
        })),
    )
    .await;
    if child_has_create_time(&created_reverse_sorted) {
        assert_eq!(
            child_names(&created_reverse_sorted),
            vec!["alpha.md", "beta.md", "gamma.md"]
        );
    }
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_file_node_returns_error_for_missing_path() {
    let env = TestCommandEnv::new("runtime-file-tree-error-api").await;
    let workspace_dir = env.path("projects/error-tree");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;

    invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;

    let error = invoke_async_error(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": "missing/path",
            "sortType": "name",
            "recursive": true
        })),
    )
    .await;
    assert!(error.contains("workspace get_node error"));
    assert!(error.contains("missing/path"));
}

#[tokio::test(flavor = "current_thread")]
async fn workspace_runtime_file_tree_handles_larger_directory_shapes() {
    let env = TestCommandEnv::new("runtime-file-tree-bulk-api").await;
    let workspace_dir = env.path("projects/bulk-tree");

    let record = invoke_async_json::<Value>(
        "workspace.registry.create_workspace",
        Some(json!({ "path": workspace_dir })),
    )
    .await;

    fs::create_dir_all(env.path("projects/bulk-tree/notes")).expect("create notes dir");
    fs::create_dir_all(env.path("projects/bulk-tree/assets")).expect("create assets dir");
    for index in 0..48 {
        fs::write(
            env.path(format!("projects/bulk-tree/notes/note-{index:02}.md")),
            format!("note-{index}\n"),
        )
        .expect("write bulk note");
    }
    for index in 0..12 {
        fs::write(
            env.path(format!("projects/bulk-tree/assets/image-{index:02}.png")),
            b"png",
        )
        .expect("write bulk asset");
    }

    invoke_async_json::<Value>(
        "workspace.runtime.open_workspace",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;

    let notes_node = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_node",
        Some(json!({
            "workspaceId": record["metadata"]["id"],
            "nodePath": "notes",
            "sortType": "name",
            "recursive": false
        })),
    )
    .await;
    assert_eq!(
        notes_node["children"]
            .as_array()
            .expect("notes children")
            .len(),
        48
    );
    assert_eq!(notes_node["fileCount"], 48);
    assert_eq!(notes_node["dirCount"], 0);

    let file_tree = invoke_async_json::<Value>(
        "workspace.runtime.get_open_workspace_file_tree",
        Some(json!({ "workspaceId": record["metadata"]["id"] })),
    )
    .await;
    assert_eq!(file_tree["root"]["fileCount"], 60);
    assert_eq!(file_tree["root"]["dirCount"], 2);
}

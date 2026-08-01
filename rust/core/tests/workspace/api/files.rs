use lonanote_core::workspace::WorkspaceId;
use serde_json::{json, Value};

use crate::support::{invoke_json, invoke_unit};

use super::fixture::{close_and_remove, create_managed, locked_app, run, workspace_args};

#[test]
fn file_flow() {
    let (_app, _guard) = locked_app();
    run(async {
        let id = create_managed("API Files").await.id;

        invoke_unit(
            "workspace.file.create_directory",
            json!({"workspaceId": id, "path": "notes"}),
        )
        .await;
        write_files(id).await;
        assert_file_queries(id).await;

        invoke_unit(
            "workspace.file.rename",
            json!({
                "workspaceId": id,
                "fromPath": "notes/today.md",
                "toPath": "notes/renamed.md"
            }),
        )
        .await;
        invoke_unit(
            "workspace.file.remove",
            json!({"workspaceId": id, "path": "notes/data.bin", "recursive": false}),
        )
        .await;

        assert_index_queries(id).await;
        close_and_remove(id).await;
    });
}

async fn write_files(id: WorkspaceId) {
    invoke_unit(
        "workspace.file.write_text",
        json!({
            "workspaceId": id,
            "path": "notes/today.md",
            "text": "from command",
            "overwrite": true,
            "createParent": true
        }),
    )
    .await;
    invoke_unit(
        "workspace.file.write_bytes",
        json!({
            "workspaceId": id,
            "path": "notes/data.bin",
            "data": [0, 1, 255],
            "overwrite": true,
            "createParent": true
        }),
    )
    .await;
}

async fn assert_file_queries(id: WorkspaceId) {
    let capabilities: Value = invoke_json("workspace.file.capabilities", workspace_args(id)).await;
    assert_eq!(capabilities["canRead"], true);

    let exists: bool = invoke_json(
        "workspace.file.exists",
        json!({"workspaceId": id, "path": "notes/today.md"}),
    )
    .await;
    assert!(exists);

    let metadata: Value = invoke_json(
        "workspace.file.metadata",
        json!({"workspaceId": id, "path": "notes/today.md"}),
    )
    .await;
    assert_eq!(metadata["size"], 12);

    let entries: Vec<Value> = invoke_json(
        "workspace.file.list",
        json!({"workspaceId": id, "path": "notes"}),
    )
    .await;
    assert_eq!(entries.len(), 2);

    let text: String = invoke_json(
        "workspace.file.read_text",
        json!({"workspaceId": id, "path": "notes/today.md"}),
    )
    .await;
    let bytes: Vec<u8> = invoke_json(
        "workspace.file.read_bytes",
        json!({"workspaceId": id, "path": "notes/data.bin"}),
    )
    .await;
    assert_eq!(text, "from command");
    assert_eq!(bytes, [0, 1, 255]);
}

async fn assert_index_queries(id: WorkspaceId) {
    let tree: Value = invoke_json(
        "workspace.index.get_tree",
        json!({"workspaceId": id, "recursive": true}),
    )
    .await;
    assert!(tree["root"].is_object());

    let node: Value = invoke_json(
        "workspace.index.get_node",
        json!({"workspaceId": id, "path": "notes", "recursive": true}),
    )
    .await;
    assert_eq!(node["path"], "notes");
    invoke_unit("workspace.index.refresh", workspace_args(id)).await;
}

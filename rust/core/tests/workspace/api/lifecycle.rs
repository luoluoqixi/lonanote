use lonanote_core::workspace::WorkspaceSnapshot;
use serde_json::{json, Value};

use crate::support::{invoke_json, invoke_unit};

use super::fixture::{
    close_and_remove, create_managed, external_binding_json, locked_app, remove_closed, run,
    workspace_args,
};

#[test]
fn managed_flow() {
    let (_app, _guard) = locked_app();
    run(async {
        let id = create_managed("API Lifecycle").await.id;

        let snapshot: Value = invoke_json("workspace.get", workspace_args(id)).await;
        assert_eq!(snapshot["id"], id.to_string());
        assert_eq!(snapshot["storage"]["kind"], "managed");

        let is_open: bool = invoke_json("workspace.is_open", workspace_args(id)).await;
        assert!(is_open);

        let listed: Vec<Value> = invoke_json("workspace.list", json!({})).await;
        assert!(listed.iter().any(|item| item["id"] == id.to_string()));

        let renamed: Value = invoke_json(
            "workspace.update_display_name",
            json!({"workspaceId": id, "displayName": "API Renamed"}),
        )
        .await;
        assert_eq!(renamed["displayName"], "API Renamed");

        invoke_unit("workspace.close", workspace_args(id)).await;
        let reopened: Value = invoke_json("workspace.open", workspace_args(id)).await;
        assert_eq!(reopened["id"], id.to_string());
        close_and_remove(id).await;
    });
}

#[test]
fn external_attach_flow() {
    let (app, _guard) = locked_app();
    let root = app.external_dir("api-external");
    run(async {
        let created: WorkspaceSnapshot = invoke_json(
            "workspace.create_external",
            json!({
                "binding": external_binding_json(&root),
                "displayName": "API External"
            }),
        )
        .await;

        invoke_unit("workspace.close", workspace_args(created.id)).await;
        let removed: Value = invoke_json(
            "workspace.remove",
            json!({"workspaceId": created.id, "deleteFiles": false}),
        )
        .await;
        assert_eq!(removed["fileCleanup"]["status"], "retained");

        let attached: Value = invoke_json(
            "workspace.attach",
            json!({"binding": external_binding_json(&root)}),
        )
        .await;
        assert_eq!(attached["id"], created.id.to_string());
        remove_closed(created.id).await;
    });
}

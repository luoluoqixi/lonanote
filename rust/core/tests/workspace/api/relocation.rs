use serde_json::{json, Value};

use crate::support::{invoke_json, invoke_unit};

use super::fixture::{
    create_managed, external_binding_json, locked_app, remove_closed, run, workspace_args,
};

#[test]
fn relocation_flow() {
    let (app, _guard) = locked_app();
    let target = app.external_dir("api-relocated");
    run(async {
        let id = create_managed("API Relocation").await.id;
        invoke_unit("workspace.close", workspace_args(id)).await;

        let relocated: Value = invoke_json(
            "workspace.relocate",
            json!({
                "workspaceId": id,
                "target": {
                    "kind": "external",
                    "binding": external_binding_json(&target)
                }
            }),
        )
        .await;
        assert_eq!(relocated["workspaceId"], id.to_string());
        assert_eq!(relocated["sourceCleanup"]["status"], "removed");
        assert_eq!(relocated["sourceStorage"]["kind"], "managed");
        assert_eq!(relocated["targetStorage"]["kind"], "external");
        assert!(!relocated.to_string().contains("resourceRef"));
        assert!(!relocated.to_string().contains("resourceIdentity"));
        remove_closed(id).await;
    });
}

#[test]
fn rebind_json_contract_preserves_id_and_does_not_initialize_directory() {
    let (app, _guard) = locked_app();
    run(async {
        let created = create_managed("API Rebind").await;
        invoke_unit("workspace.close", workspace_args(created.id)).await;
        let old = app.managed_workspace_root(&created);
        let target = app.external_dir("api-rebind-target");
        std::fs::remove_dir(&target).unwrap();
        std::fs::rename(&old, &target).unwrap();
        let before = std::fs::read(target.join(".lonanote/manifest.json")).unwrap();
        let result: Value = invoke_json(
            "workspace.rebind",
            json!({"workspaceId": created.id, "binding": external_binding_json(&target)}),
        )
        .await;
        assert_eq!(result["kind"], "external");
        assert_eq!(result["providerId"], "desktop-folder");
        assert!(result.get("resourceRef").is_none());
        assert_eq!(
            std::fs::read(target.join(".lonanote/manifest.json")).unwrap(),
            before
        );
        let opened: Value = invoke_json("workspace.open", workspace_args(created.id)).await;
        assert_eq!(opened["id"], created.id.to_string());
        invoke_unit("workspace.close", workspace_args(created.id)).await;
        remove_closed(created.id).await;
    });
}

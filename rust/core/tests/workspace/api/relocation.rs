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
        assert_eq!(relocated["sourceCleanup"]["status"], "retained");
        remove_closed(id).await;
    });
}

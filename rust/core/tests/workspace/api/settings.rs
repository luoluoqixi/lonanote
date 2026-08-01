use lonanote_core::workspace::WorkspaceId;
use serde_json::{json, Value};

use crate::support::invoke_json;

use super::fixture::{close_and_remove, create_managed, locked_app, run, workspace_args};

#[test]
fn settings_round_trip() {
    let (_app, _guard) = locked_app();
    run(async {
        let id = create_managed("API Settings").await.id;

        let mut settings: Value = invoke_json("workspace.get_settings", workspace_args(id)).await;
        assert_eq!(settings["historySnapshotCount"], 20);
        settings["historySnapshotCount"] = json!(7);
        let updated: Value = invoke_json(
            "workspace.set_settings",
            json!({"workspaceId": id, "settings": settings}),
        )
        .await;
        assert_eq!(updated["historySnapshotCount"], 7);

        close_and_remove(id).await;
    });
}

#[test]
fn session_tracks_last_workspace() {
    let (_app, _guard) = locked_app();
    run(async {
        let id = create_managed("API Session").await.id;

        let last_id: Option<WorkspaceId> =
            invoke_json("workspace.get_last_workspace_id", json!({})).await;
        assert_eq!(last_id, Some(id));

        close_and_remove(id).await;
    });
}

#[test]
fn local_setting_round_trip() {
    let (_app, _guard) = locked_app();
    run(async {
        let id = create_managed("API Local Setting").await.id;

        let setting: Value = invoke_json("workspace.get_local_setting", workspace_args(id)).await;
        assert!(setting["lastOpenedAt"].is_number());
        let setting: Value = invoke_json(
            "workspace.set_last_open_file",
            json!({"workspaceId": id, "path": "notes/today.md"}),
        )
        .await;
        assert_eq!(setting["lastOpenFile"], "notes/today.md");
        close_and_remove(id).await;
    });
}

use lonanote_core::{
    config::system_locale::system_locale,
    workspace::{
        workspace_manager, ResolveScanWorkspaceIdConflictResult, ScanManagedWorkspacesResult,
        WorkspaceId, WorkspaceManifest, WorkspaceSnapshot,
    },
};
use serde_json::{json, Value};

use crate::support::{invoke_json, invoke_unit, provider, MANAGED_PROVIDER};

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
        let listed = listed
            .iter()
            .find(|item| item["id"] == id.to_string())
            .expect("创建的 Workspace 必须出现在列表中");
        assert!(listed["createdAt"].as_u64().is_some());
        assert!(listed["lastOpenedAt"].as_u64().is_some());
        assert!(listed["modifiedAt"].as_u64().is_some());

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
        assert_eq!(removed["storage"]["kind"], "external");
        assert!(!removed.to_string().contains("resourceRef"));
        assert!(!removed.to_string().contains("resourceIdentity"));

        let attached: Value = invoke_json(
            "workspace.attach",
            json!({"binding": external_binding_json(&root)}),
        )
        .await;
        assert_eq!(attached["id"], created.id.to_string());
        assert_eq!(attached["storage"]["kind"], "external");
        assert!(!attached.to_string().contains("resourceRef"));
        assert!(!attached.to_string().contains("resourceIdentity"));
        remove_closed(created.id).await;
    });
}

#[test]
fn managed_scan_flow() {
    let (_app, _guard) = locked_app();
    run(async {
        let created = create_managed("API Scan").await;
        invoke_unit("workspace.close", workspace_args(created.id)).await;
        let _: Value = invoke_json(
            "workspace.remove",
            json!({"workspaceId": created.id, "deleteFiles": false}),
        )
        .await;

        let result: Value = invoke_json("workspace.scan_managed", json!({})).await;
        assert_eq!(result["registeredCount"], 1);
        assert_eq!(result["bindingConflictCount"], 0);
        remove_closed(created.id).await;
    });
}

#[test]
fn diagnosed_open_and_id_resolution_flow() {
    let (app, _guard) = locked_app();
    run(async {
        let created = create_managed("API ID Repair").await;
        invoke_unit("workspace.close", workspace_args(created.id)).await;
        let manifest_path = app
            .managed_workspace_root(&created)
            .join(".lonanote/manifest.json");
        let mut manifest: WorkspaceManifest =
            serde_json::from_slice(&std::fs::read(&manifest_path).unwrap()).unwrap();
        let actual_id = WorkspaceId::new();
        manifest.id = actual_id;
        std::fs::write(
            &manifest_path,
            serde_json::to_vec_pretty(&manifest).unwrap(),
        )
        .unwrap();

        let diagnostic: Value = invoke_json(
            "workspace.open_with_diagnostics",
            workspace_args(created.id),
        )
        .await;
        assert_eq!(diagnostic["status"], "idMismatch");
        assert_eq!(diagnostic["expectedId"], created.id.to_string());
        assert_eq!(diagnostic["actualId"], actual_id.to_string());
        assert_eq!(diagnostic["manifestIdRegistered"], false);

        let repaired: WorkspaceSnapshot = invoke_json(
            "workspace.resolve_id_mismatch",
            json!({"workspaceId": created.id, "resolution": "useManifestId"}),
        )
        .await;
        assert_eq!(repaired.id, actual_id);
        close_and_remove(actual_id).await;
    });
}

#[test]
fn scan_id_conflict_resolution_flow() {
    let (app, _guard) = locked_app();
    run(async {
        let first = create_managed("API Duplicate First").await;
        let second = create_managed("API Duplicate Second").await;
        invoke_unit("workspace.close", workspace_args(first.id)).await;
        invoke_unit("workspace.close", workspace_args(second.id)).await;
        let _: Value = invoke_json(
            "workspace.remove",
            json!({"workspaceId": second.id, "deleteFiles": false}),
        )
        .await;
        let first_path = app
            .managed_workspace_root(&first)
            .join(".lonanote/manifest.json");
        let second_path = app
            .managed_workspace_root(&second)
            .join(".lonanote/manifest.json");
        let mut manifest: WorkspaceManifest =
            serde_json::from_slice(&std::fs::read(&second_path).unwrap()).unwrap();
        manifest.id = first.id;
        std::fs::write(&second_path, serde_json::to_vec_pretty(&manifest).unwrap()).unwrap();
        let scan: ScanManagedWorkspacesResult =
            invoke_json("workspace.scan_managed", json!({})).await;
        let conflict = scan
            .id_conflicts
            .iter()
            .find(|group| group.workspace_id == first.id)
            .unwrap();
        assert_eq!(conflict.candidates.len(), 2);
        assert!(conflict.candidates[0].is_registered);
        let encoded = serde_json::to_value(conflict).unwrap().to_string();
        assert!(!encoded.contains("resourceRef"));
        assert!(!encoded.contains("resourceIdentity"));
        invoke_unit(
            "workspace.discard_scan_id_conflict",
            json!({"conflictId": conflict.conflict_id}),
        )
        .await;
        let scan: ScanManagedWorkspacesResult =
            invoke_json("workspace.scan_managed", json!({})).await;
        let conflict = scan
            .id_conflicts
            .iter()
            .find(|group| group.workspace_id == first.id)
            .unwrap();
        let resolved: ResolveScanWorkspaceIdConflictResult = invoke_json(
            "workspace.resolve_scan_id_conflict",
            json!({"conflictId": conflict.conflict_id, "keepCandidateIndex": 1}),
        )
        .await;
        assert_eq!(resolved.registered_count, 1);
        assert_eq!(resolved.regenerated_count, 1);
        let rekeyed: WorkspaceManifest =
            serde_json::from_slice(&std::fs::read(&first_path).unwrap()).unwrap();
        assert_ne!(rekeyed.id, first.id);
        let keeper: WorkspaceManifest =
            serde_json::from_slice(&std::fs::read(&second_path).unwrap()).unwrap();
        assert_eq!(keeper.id, first.id);
        remove_closed(rekeyed.id).await;
        remove_closed(first.id).await;
    });
}

#[test]
fn gm_reset_initial_workspace_flow() {
    let (_app, _guard) = locked_app();
    run(async {
        let initial = workspace_manager()
            .create_initial_workspace_if_needed(provider(MANAGED_PROVIDER))
            .await
            .unwrap()
            .expect("首次启动必须创建默认 Workspace");

        let removed: Option<Value> =
            invoke_json("gm.workspace.reset_initial_workspace", json!({})).await;
        let removed = removed.expect("GM 命令必须删除首次默认 Workspace");
        assert_eq!(removed["workspaceId"], initial.id.to_string());

        let workspaces: Vec<Value> = invoke_json("workspace.list", json!({})).await;
        assert!(workspaces.is_empty());
    });
}

#[test]
fn system_get_system_locale_flow() {
    let (_app, _guard) = locked_app();
    run(async {
        let locale: String = invoke_json("system.get_system_locale", json!({})).await;
        assert_eq!(locale, system_locale());
    });
}

#[test]
fn workspace_state_api_flow() {
    let (app, _guard) = locked_app();
    run(async {
        let created = create_managed("API State").await;
        let status: Value = invoke_json("workspace.get_state", workspace_args(created.id)).await;
        assert_eq!(status["state"]["schemaVersion"], 1);
        assert_eq!(status["savePending"], false);
        std::fs::write(
            app.managed_workspace_root(&created)
                .join(".lonanote/state.json"),
            r#"{"schemaVersion":1,"modifiedAt":1}"#,
        )
        .unwrap();
        let reloaded: Value =
            invoke_json("workspace.reload_state", workspace_args(created.id)).await;
        assert_eq!(reloaded["state"]["modifiedAt"], 1);
        let flushed: Value = invoke_json("workspace.flush_state", workspace_args(created.id)).await;
        assert_eq!(flushed, reloaded);
        close_and_remove(created.id).await;
    });
}

use std::collections::BTreeSet;

use lonanote_core::{get_command_async_keys, invoke_command_async, CommandContext};
use serde_json::json;

use super::fixture::{locked_app, run};

#[test]
fn command_keys() {
    let (_app, _guard) = locked_app();
    let actual = get_command_async_keys()
        .unwrap()
        .into_iter()
        .filter(|key| key.starts_with("workspace."))
        .collect::<BTreeSet<_>>();

    assert_eq!(actual, expected_keys());
    assert!(actual.iter().all(|key| {
        !key.contains(".registry.")
            && !key.contains(".runtime.")
            && !key.contains(".storage.")
            && !key.contains("_by_path")
    }));
}

#[test]
fn invalid_arguments() {
    let (_app, _guard) = locked_app();
    run(async {
        let args = json!({"providerId": 7, "displayName": "Invalid"});
        assert!(
            invoke_command_async("workspace.create_managed", CommandContext::Value(&args))
                .await
                .is_err()
        );
    });
}

fn expected_keys() -> BTreeSet<String> {
    [
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
        "workspace.get_default_settings",
        "workspace.get_last_workspace_id",
        "workspace.get_local_setting",
        "workspace.get_settings",
        "workspace.index.get_node",
        "workspace.index.get_tree",
        "workspace.index.refresh",
        "workspace.is_open",
        "workspace.list",
        "workspace.list_managed_storage_provider_ids",
        "workspace.list_storage_provider_ids",
        "workspace.open",
        "workspace.relocate",
        "workspace.remove",
        "workspace.reset_settings",
        "workspace.set_last_open_file",
        "workspace.set_settings",
        "workspace.update_display_name",
    ]
    .into_iter()
    .map(String::from)
    .collect()
}

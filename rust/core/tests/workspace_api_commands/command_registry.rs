use lonanote_core::{get_command_async_keys, get_command_keys};

use super::support::init_commands_once;

#[test]
fn command_registry_exposes_workspace_api_keys() {
    init_commands_once();

    let sync_keys = get_command_keys().expect("get sync command keys");
    assert!(sync_keys.contains(&String::from("path.init_dir")));
    assert!(sync_keys.contains(&String::from("path.get_data_dir")));

    let async_keys = get_command_async_keys().expect("get async command keys");
    assert!(async_keys.contains(&String::from("settings.get_settings")));
    assert!(async_keys.contains(&String::from("workspace.registry.create_workspace")));
    assert!(async_keys.contains(&String::from("workspace.registry.set_workspace_roots")));
    assert!(async_keys.contains(&String::from("workspace.runtime.open_workspace")));
    assert!(async_keys.contains(&String::from(
        "workspace.runtime.get_open_workspace_file_node"
    )));
}

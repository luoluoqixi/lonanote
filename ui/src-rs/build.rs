use std::{collections::HashMap, env, fs, sync::LazyLock};

use serde::{Deserialize, Serialize};
use tauri_build::{try_build, Attributes, DefaultPermissionRule, InlinedPlugin};

#[derive(Default, Serialize, Deserialize)]
struct PluginDefine {
    name: String,
    commands: Vec<String>,
}

#[derive(Default, Serialize, Deserialize)]
struct PluginConfig {
    #[serde(rename = "plugins")]
    plugins: Vec<PluginDefine>,
}

static PLUGIN_CONFIG: LazyLock<PluginConfig> = LazyLock::new(|| {
    let plugins_path = env::current_dir()
        .unwrap()
        .join("./permission/plugins.json");
    serde_json::from_str(
        fs::read_to_string(&plugins_path)
            .unwrap_or_else(|_| panic!("notfound file: {}", plugins_path.display()))
            .as_str(),
    )
    .expect("parse json error")
});

static PLUGIN_CONFIG_COMMANDS: LazyLock<HashMap<String, Vec<&'static str>>> = LazyLock::new(|| {
    let mut map = HashMap::new();
    for p in PLUGIN_CONFIG.plugins.iter() {
        map.insert(
            p.name.clone(),
            p.commands
                .iter()
                .map(|c| string_to_static_str(c.clone()))
                .collect::<Vec<&'static str>>(),
        );
    }
    map
});

fn string_to_static_str(s: String) -> &'static str {
    Box::leak(s.into_boxed_str())
}

fn main() {
    let mut attributes = Attributes::new();
    for (name, commands) in PLUGIN_CONFIG_COMMANDS.iter() {
        attributes = attributes.plugin(
            name.as_str(),
            InlinedPlugin::new()
                .commands(commands)
                .default_permission(DefaultPermissionRule::AllowAllCommands),
        );
    }
    try_build(attributes).expect("failed to run tauri-build");
}

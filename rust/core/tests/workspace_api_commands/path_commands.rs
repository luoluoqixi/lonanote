use serde_json::json;

use super::support::{invoke_sync_json, invoke_sync_none, TestCommandEnv};

#[tokio::test(flavor = "current_thread")]
async fn path_commands_return_initialized_directories() {
    let env = TestCommandEnv::new("path-api").await;

    let data_dir = invoke_sync_json::<String>("path.get_data_dir", None);
    let cache_dir = invoke_sync_json::<String>("path.get_cache_dir", None);
    let download_dir = invoke_sync_json::<String>("path.get_download_dir", None);
    let home_dir = invoke_sync_json::<String>("path.get_home_dir", None);

    assert_eq!(data_dir, env.data_dir.to_string_lossy());
    assert_eq!(cache_dir, env.cache_dir.to_string_lossy());
    assert_eq!(download_dir, env.download_dir.to_string_lossy());
    assert_eq!(home_dir, env.home_dir.to_string_lossy());
}

#[tokio::test(flavor = "current_thread")]
async fn path_init_dir_can_switch_runtime_paths() {
    let env = TestCommandEnv::new("path-switch").await;
    let next_data_dir = env.path("alt/data");
    let next_cache_dir = env.path("alt/cache");
    let next_download_dir = env.path("alt/download");
    let next_home_dir = env.path("alt/home");

    invoke_sync_none(
        "path.init_dir",
        Some(json!({
            "dataDir": next_data_dir,
            "cacheDir": next_cache_dir,
            "downloadDir": next_download_dir,
            "homeDir": next_home_dir,
        })),
    )
    .expect("switch app paths");

    assert_eq!(
        invoke_sync_json::<String>("path.get_data_dir", None),
        env.path("alt/data").to_string_lossy()
    );
}

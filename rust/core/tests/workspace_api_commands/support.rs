use std::{
    fs,
    path::{Path, PathBuf},
    sync::{LazyLock, OnceLock},
};

use lonanote_core::{init, invoke_command, invoke_command_async, CommandContext};
use serde::de::DeserializeOwned;
use serde_json::{json, Value};
use tokio::sync::{Mutex, MutexGuard};

static TEST_GUARD: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));
static COMMANDS_INIT: OnceLock<()> = OnceLock::new();

pub(crate) struct TestCommandEnv {
    _guard: MutexGuard<'static, ()>,
    pub(crate) base_dir: PathBuf,
    pub(crate) data_dir: PathBuf,
    pub(crate) cache_dir: PathBuf,
    pub(crate) download_dir: PathBuf,
    pub(crate) home_dir: PathBuf,
}

impl TestCommandEnv {
    pub(crate) async fn new(name: &str) -> Self {
        init_commands_once_async().await;

        let guard = TEST_GUARD.lock().await;
        let base_dir = workspace_api_tests_root().join(format!("{name}-{}", uuid::Uuid::new_v4()));
        let data_dir = base_dir.join("data");
        let cache_dir = base_dir.join("cache");
        let download_dir = base_dir.join("download");
        let home_dir = base_dir.join("home");

        fs::create_dir_all(&data_dir).expect("create data dir");
        fs::create_dir_all(&cache_dir).expect("create cache dir");
        fs::create_dir_all(&download_dir).expect("create download dir");
        fs::create_dir_all(&home_dir).expect("create home dir");

        invoke_sync_none(
            "path.init_dir",
            Some(json!({
                "dataDir": data_dir,
                "cacheDir": cache_dir,
                "downloadDir": download_dir,
                "homeDir": home_dir,
            })),
        )
        .expect("init app paths");

        reset_settings_to_default().await;
        cleanup_workspace_state().await;

        Self {
            _guard: guard,
            base_dir,
            data_dir,
            cache_dir,
            download_dir,
            home_dir,
        }
    }

    pub(crate) fn path(&self, relative: impl AsRef<Path>) -> PathBuf {
        self.base_dir.join(relative)
    }
}

impl Drop for TestCommandEnv {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.base_dir);
    }
}

pub(crate) fn init_commands_once() {
    COMMANDS_INIT.get_or_init(|| {
        init().expect("init commands");
    });
}

pub(crate) async fn init_commands_once_async() {
    if COMMANDS_INIT.get().is_some() {
        return;
    }

    tokio::task::spawn_blocking(init_commands_once)
        .await
        .expect("join init commands blocking task");
}

pub(crate) async fn cleanup_workspace_state() {
    let records =
        invoke_async_json::<Vec<Value>>("workspace.registry.list_workspace_records", None).await;

    for record in records {
        let workspace_id = record["metadata"]["id"].as_str().expect("workspace id");
        let _ = invoke_command_async(
            "workspace.runtime.close_workspace",
            CommandContext::Value(&json!({ "workspaceId": workspace_id })),
        )
        .await;
        let _ = invoke_command_async(
            "workspace.registry.remove_workspace",
            CommandContext::Value(&json!({
                "workspaceId": workspace_id,
                "deleteFile": true
            })),
        )
        .await;
    }

    let _ = invoke_command_async(
        "workspace.registry.set_workspace_roots",
        CommandContext::Value(&json!({ "roots": [] })),
    )
    .await;
}

pub(crate) async fn reset_settings_to_default() {
    invoke_async_none(
        "settings.set_settings_and_save",
        Some(json!({
            "firstSetup": true,
            "autoCheckUpdate": true,
            "autoOpenLastWorkspace": true,
            "autoSave": true,
            "autoSaveInterval": 1.0,
            "autoSaveFocusChange": true,
            "showLineNumber": false,
            "disableLineWrap": false,
            "sourceMode": false
        })),
    )
    .await;
}

pub(crate) fn invoke_sync_none(command: &str, args: Option<Value>) -> anyhow::Result<()> {
    match args.as_ref() {
        Some(value) => {
            invoke_command(command, CommandContext::Value(value))?;
        }
        None => {
            invoke_command(command, CommandContext::None)?;
        }
    };

    Ok(())
}

pub(crate) fn invoke_sync_json<T: DeserializeOwned>(command: &str, args: Option<Value>) -> T {
    let response = match args.as_ref() {
        Some(value) => {
            invoke_command(command, CommandContext::Value(value)).expect("invoke sync command")
        }
        None => invoke_command(command, CommandContext::None).expect("invoke sync command"),
    };

    let json = response.into_option().expect("json response");
    serde_json::from_str(&json).expect("parse json response")
}

pub(crate) async fn invoke_async_none(command: &str, args: Option<Value>) {
    match args.as_ref() {
        Some(value) => invoke_command_async(command, CommandContext::Value(value))
            .await
            .expect("invoke async command"),
        None => invoke_command_async(command, CommandContext::None)
            .await
            .expect("invoke async command"),
    };
}

pub(crate) async fn invoke_async_json<T: DeserializeOwned>(
    command: &str,
    args: Option<Value>,
) -> T {
    let response = match args.as_ref() {
        Some(value) => invoke_command_async(command, CommandContext::Value(value))
            .await
            .expect("invoke async command"),
        None => invoke_command_async(command, CommandContext::None)
            .await
            .expect("invoke async command"),
    };

    let json = response.into_option().expect("json response");
    serde_json::from_str(&json).expect("parse json response")
}

pub(crate) async fn invoke_async_error(command: &str, args: Option<Value>) -> String {
    let error = match args.as_ref() {
        Some(value) => invoke_command_async(command, CommandContext::Value(value)).await,
        None => invoke_command_async(command, CommandContext::None).await,
    }
    .expect_err("command should fail");

    error.to_string()
}

pub(crate) fn create_external_workspace(path: &Path, with_id: bool) {
    fs::create_dir_all(path.join(".lonanote")).expect("create external workspace config dir");

    let workspace_id = if with_id {
        uuid::Uuid::new_v4().to_string()
    } else {
        String::new()
    };

    fs::write(
        path.join(".lonanote/workspace.json"),
        serde_json::to_string_pretty(&json!({
            "id": workspace_id,
            "createTime": 1,
            "fileTreeSortType": "name",
            "followGitignore": true,
            "customIgnore": "",
            "uploadImagePath": "assets/images",
            "uploadAttachmentPath": "assets/attachments",
            "histroySnapshootCount": 20
        }))
        .expect("serialize workspace settings"),
    )
    .expect("write external workspace settings");
}

pub(crate) fn json_field<'a>(value: &'a Value, keys: &[&str]) -> Option<&'a str> {
    keys.iter()
        .find_map(|key| value.get(*key).and_then(Value::as_str))
}

fn workspace_api_tests_root() -> PathBuf {
    repo_root().join("target").join("workspace-api-tests")
}

fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("resolve repo root")
        .to_path_buf()
}

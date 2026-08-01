use std::{
    future::Future,
    path::{Path, PathBuf},
    sync::{Arc, Mutex, MutexGuard, OnceLock},
};

use lonanote_core::init;
use lonanote_core::workspace::{
    install_workspace_manager, LocalFsResolver, WorkspaceId, WorkspaceManager, WorkspaceSnapshot,
    WorkspaceStorageResolver,
};
use serde_json::{json, Value};
use tempfile::TempDir;

use crate::support::{invoke_json, invoke_unit, provider, EXTERNAL_PROVIDER, MANAGED_PROVIDER};

static API_APP: OnceLock<ApiTestApp> = OnceLock::new();

/// cmdreg 和 WorkspaceManager 都是进程级全局状态，因此 API 场景共享一次初始化。
pub(super) struct ApiTestApp {
    _temp: TempDir,
    root: PathBuf,
    test_lock: Mutex<()>,
}

impl ApiTestApp {
    pub(super) fn external_dir(&self, name: &str) -> PathBuf {
        let path = self.root.join(name);
        std::fs::create_dir_all(&path).unwrap();
        path
    }
}

pub(super) fn locked_app() -> (&'static ApiTestApp, MutexGuard<'static, ()>) {
    let app = app();
    // API 场景会读写同一 Catalog；串行执行可让每个测试只观察自己的调用流程。
    let guard = app
        .test_lock
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    (app, guard)
}

pub(super) fn run(future: impl Future<Output = ()>) {
    tokio::runtime::Runtime::new().unwrap().block_on(future);
}

pub(super) async fn create_managed(display_name: &str) -> WorkspaceSnapshot {
    invoke_json(
        "workspace.create_managed",
        json!({"providerId": MANAGED_PROVIDER, "displayName": display_name}),
    )
    .await
}

pub(super) async fn close_and_remove(id: WorkspaceId) {
    invoke_unit("workspace.close", workspace_args(id)).await;
    remove_closed(id).await;
}

pub(super) async fn remove_closed(id: WorkspaceId) {
    let removed: Value = invoke_json(
        "workspace.remove",
        json!({"workspaceId": id, "deleteFiles": true}),
    )
    .await;
    assert_eq!(removed["workspaceId"], id.to_string());
    assert!(removed.get("removedRecord").is_none());
    assert!(!removed.to_string().contains("resourceRef"));
    assert!(!removed.to_string().contains("resourceIdentity"));
}

pub(super) fn workspace_args(id: WorkspaceId) -> Value {
    json!({"workspaceId": id})
}

pub(super) fn external_binding_json(path: &Path) -> Value {
    json!({
        "kind": "external",
        "providerId": EXTERNAL_PROVIDER,
        "providerSchemaVersion": 1,
        "resourceRef": path.to_string_lossy()
    })
}

fn app() -> &'static ApiTestApp {
    API_APP.get_or_init(|| {
        let temp = TempDir::new().unwrap();
        let root = temp.path().to_path_buf();
        let resolver = Arc::new(
            LocalFsResolver::new()
                .with_managed_provider(provider(MANAGED_PROVIDER), root.join("managed"))
                .with_external_provider(provider(EXTERNAL_PROVIDER)),
        );
        let runtime = tokio::runtime::Runtime::new().unwrap();
        let manager = runtime
            .block_on(WorkspaceManager::load(
                root.join("app-data"),
                resolver as Arc<dyn WorkspaceStorageResolver>,
            ))
            .unwrap();
        install_workspace_manager(manager).unwrap();
        init().unwrap();
        ApiTestApp {
            _temp: temp,
            root,
            test_lock: Mutex::new(()),
        }
    })
}

use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Arc, LazyLock},
};

use tokio::sync::{Mutex, MutexGuard};

use crate::{
    config::app_path,
    settings::{get_settings_mut, Settings},
};

use super::super::{
    config::{create_workspace_config_folder, create_workspace_init_files},
    get_workspace_registry_mut, get_workspace_runtime_mut,
    workspace_instance::WorkspaceInstance,
    workspace_path::WorkspacePath,
    workspace_registry::WorkspaceRegistry,
    workspace_runtime::WorkspaceRuntime,
    workspace_settings::WorkspaceSettings,
};

static TEST_GUARD: LazyLock<Mutex<()>> = LazyLock::new(|| Mutex::new(()));

pub(crate) struct TestWorkspaceEnv {
    _guard: MutexGuard<'static, ()>,
    pub(crate) base_dir: PathBuf,
    pub(crate) data_dir: PathBuf,
}

impl TestWorkspaceEnv {
    pub(crate) async fn new(name: &str) -> Self {
        let guard = TEST_GUARD.lock().await;
        let base_dir = workspace_tests_root().join(format!("{name}-{}", uuid::Uuid::new_v4()));
        let data_dir = base_dir.join("data");
        let cache_dir = base_dir.join("cache");
        let download_dir = base_dir.join("download");
        let home_dir = base_dir.join("home");

        fs::create_dir_all(&data_dir).expect("create data dir");
        fs::create_dir_all(&cache_dir).expect("create cache dir");
        fs::create_dir_all(&download_dir).expect("create download dir");
        fs::create_dir_all(&home_dir).expect("create home dir");

        app_path::init_dir(
            data_dir.to_string_lossy(),
            cache_dir.to_string_lossy(),
            download_dir.to_string_lossy(),
            home_dir.to_string_lossy(),
        );

        {
            let mut settings = get_settings_mut().await;
            *settings = Settings::new();
        }

        {
            let mut workspace_runtime = get_workspace_runtime_mut().await;
            *workspace_runtime = WorkspaceRuntime::new();
        }

        {
            let mut workspace_registry = get_workspace_registry_mut().await;
            *workspace_registry = WorkspaceRegistry::new();
        }

        Self {
            _guard: guard,
            base_dir,
            data_dir,
        }
    }

    pub(crate) fn path(&self, relative: impl AsRef<Path>) -> PathBuf {
        self.base_dir.join(relative)
    }
}

impl Drop for TestWorkspaceEnv {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.base_dir);
    }
}

pub(crate) async fn open_workspace_for_test(workspace_id: &str) -> Arc<WorkspaceInstance> {
    let (workspace_path, settings) = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .prepare_workspace_open(workspace_id)
            .expect("prepare workspace open")
    };

    let (workspace, should_reinit) = {
        let mut workspace_runtime = get_workspace_runtime_mut().await;
        workspace_runtime
            .open_workspace(workspace_id, &workspace_path, &settings)
            .expect("open workspace")
    };

    if should_reinit {
        workspace.reinit().await.expect("reinit workspace");
    }

    workspace.mark_opened().await;
    workspace
}

pub(crate) async fn close_workspace_for_test(workspace_id: &str) {
    let workspace = {
        let mut workspace_runtime = get_workspace_runtime_mut().await;
        workspace_runtime.close_workspace(workspace_id)
    };

    if let Some(workspace) = workspace {
        workspace.mark_closing().await;
        workspace.unload().await.expect("unload workspace");
    }
}

pub(crate) fn create_external_workspace(path: &Path) -> String {
    create_external_workspace_with(path, true)
}

pub(crate) fn create_external_workspace_without_id(path: &Path) {
    let _ = create_external_workspace_with(path, false);
}

fn create_external_workspace_with(path: &Path, ensure_id: bool) -> String {
    fs::create_dir_all(path).expect("create external workspace dir");

    let workspace_path = WorkspacePath::from(path.as_os_str());
    create_workspace_config_folder(&workspace_path).expect("create config dir");
    create_workspace_init_files(&workspace_path).expect("create init files");

    let mut settings = WorkspaceSettings::new(&workspace_path).expect("load workspace settings");
    if ensure_id {
        settings.ensure_id();
    }
    settings.create_time = Some(1);
    settings.save_sync().expect("save workspace settings");

    settings.id
}

fn workspace_tests_root() -> PathBuf {
    repo_root().join("target").join("workspace-tests")
}

fn repo_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("resolve repo root")
        .to_path_buf()
}
use crate::{
    settings::get_settings,
    workspace::{get_workspace_registry, get_workspace_registry_mut, workspace_path::WorkspacePath},
};

use super::support::TestWorkspaceEnv;

#[tokio::test(flavor = "current_thread")]
async fn init_setup_creates_first_workspace_and_imports_default_files() {
    let env = TestWorkspaceEnv::new("init-setup").await;
    let workspace_dir = env.path("bootstrap/default-workspace");
    let workspace_path = WorkspacePath::from(workspace_dir.as_os_str());

    {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .init_setup(&workspace_path)
            .await
            .expect("init setup");
    }

    assert!(workspace_dir.exists());
    assert!(workspace_dir.join("README.md").exists());
    assert!(workspace_dir.join("README_en.md").exists());
    assert!(workspace_dir.join("assets").exists());

    {
        let workspace_registry = get_workspace_registry().await;
        let records = workspace_registry.list_workspace_records();
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].metadata.path.to_path_buf(), workspace_dir);
        assert_eq!(
            workspace_registry.get_last_workspace_id().as_deref(),
            Some(records[0].metadata.id.as_str())
        );
    }

    {
        let settings = get_settings().await;
        assert!(!settings.first_setup);
    }

    let skipped_workspace_dir = env.path("bootstrap/should-not-create");
    {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .init_setup(&WorkspacePath::from(skipped_workspace_dir.as_os_str()))
            .await
            .expect("second init setup");
        assert_eq!(workspace_registry.list_workspace_records().len(), 1);
    }

    assert!(!skipped_workspace_dir.exists());
}
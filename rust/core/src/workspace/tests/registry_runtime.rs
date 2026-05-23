use std::sync::Arc;

use crate::workspace::{
    error::WorkspaceError,
    get_workspace_registry, get_workspace_registry_mut, get_workspace_runtime,
    workspace_instance::WorkspaceRuntimeStatus,
    workspace_path::WorkspacePath,
    workspace_savedata::WorkspaceSaveData,
};

use super::support::{close_workspace_for_test, open_workspace_for_test, TestWorkspaceEnv};

#[tokio::test(flavor = "current_thread")]
async fn create_open_update_and_close_workspace_roundtrip() {
    let env = TestWorkspaceEnv::new("roundtrip").await;
    let workspace_dir = env.path("projects/alpha");
    let workspace_path = WorkspacePath::from(workspace_dir.as_os_str());

    let record = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .create_workspace(&workspace_path)
            .expect("create workspace")
    };

    assert!(workspace_dir.exists());
    assert!(!record.metadata.id.is_empty());
    assert_eq!(record.metadata.name, "alpha");
    assert_eq!(record.save_data.id, record.metadata.id);
    assert!(workspace_dir.join(".lonanote/workspace.json").exists());

    {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .set_workspace_savedata(
                &record.metadata.id,
                WorkspaceSaveData {
                    id: String::new(),
                    last_open_file_path: Some(String::from("notes/welcome.md")),
                },
            )
            .expect("set savedata");
    }

    let workspace = open_workspace_for_test(&record.metadata.id).await;

    {
        let workspace_runtime = get_workspace_runtime().await;
        assert!(workspace_runtime.is_workspace_open(&record.metadata.id));
    }

    assert_eq!(workspace.get_runtime_status().await, WorkspaceRuntimeStatus::Opened);

    let updated_settings = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        let mut settings = workspace_registry
            .get_workspace_settings(&record.metadata.id)
            .expect("get workspace settings");
        settings.follow_gitignore = false;
        settings.custom_ignore = String::from("dist\n.cache");
        workspace_registry
            .set_workspace_settings(&record.metadata.id, settings)
            .expect("set workspace settings")
    };

    workspace
        .apply_settings(&updated_settings)
        .await
        .expect("apply settings");

    let runtime_config = workspace.get_runtime_config().await;
    assert!(!runtime_config.follow_gitignore);
    assert_eq!(runtime_config.custom_ignore, "dist\n.cache");
    assert_eq!(workspace.get_runtime_status().await, WorkspaceRuntimeStatus::Opened);

    {
        let workspace_registry = get_workspace_registry().await;
        let savedata = workspace_registry
            .get_workspace_savedata(&record.metadata.id)
            .expect("get workspace savedata");
        assert_eq!(savedata.id, record.metadata.id);
        assert_eq!(savedata.last_open_file_path.as_deref(), Some("notes/welcome.md"));
        assert_eq!(
            workspace_registry.get_last_workspace_id().as_deref(),
            Some(record.metadata.id.as_str())
        );
    }

    close_workspace_for_test(&record.metadata.id).await;

    {
        let workspace_runtime = get_workspace_runtime().await;
        assert!(!workspace_runtime.is_workspace_open(&record.metadata.id));
    }

    assert!(env.data_dir.join("workspaces.json").exists());
}

#[tokio::test(flavor = "current_thread")]
async fn open_workspace_twice_reuses_loaded_instance() {
    let env = TestWorkspaceEnv::new("open-twice").await;
    let workspace_dir = env.path("projects/reuse-me");
    let workspace_path = WorkspacePath::from(workspace_dir.as_os_str());

    let record = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .create_workspace(&workspace_path)
            .expect("create workspace")
    };

    let first = open_workspace_for_test(&record.metadata.id).await;
    let second = open_workspace_for_test(&record.metadata.id).await;

    assert!(Arc::ptr_eq(&first, &second));
    assert_eq!(second.get_runtime_status().await, WorkspaceRuntimeStatus::Opened);

    close_workspace_for_test(&record.metadata.id).await;
}

#[tokio::test(flavor = "current_thread")]
async fn create_workspace_rejects_duplicate_path_and_remove_without_delete_preserves_files() {
    let env = TestWorkspaceEnv::new("duplicate-remove").await;
    let workspace_dir = env.path("projects/alpha");
    let workspace_path = WorkspacePath::from(workspace_dir.as_os_str());

    let record = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .create_workspace(&workspace_path)
            .expect("create workspace")
    };

    let duplicate_result = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry.create_workspace(&workspace_path)
    };

    assert!(matches!(
        duplicate_result,
        Err(WorkspaceError::AlreadyExistWorkspace(_))
    ));

    {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .remove_workspace(&record.metadata.id, false)
            .expect("remove workspace without deleting files");
        assert!(workspace_registry
            .get_workspace_record(&record.metadata.id)
            .is_none());
    }

    assert!(workspace_dir.exists());
    assert!(workspace_dir.join(".lonanote/workspace.json").exists());
}

#[tokio::test(flavor = "current_thread")]
async fn rename_move_and_remove_workspace_roundtrip() {
    let env = TestWorkspaceEnv::new("move-remove").await;
    let workspace_dir = env.path("projects/alpha");
    let workspace_path = WorkspacePath::from(workspace_dir.as_os_str());

    let record = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .create_workspace(&workspace_path)
            .expect("create workspace")
    };

    let workspace_id = record.metadata.id.clone();
    open_workspace_for_test(&workspace_id).await;
    close_workspace_for_test(&workspace_id).await;

    let renamed_record = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .set_workspace_name(&workspace_id, "beta", true)
            .expect("rename workspace")
    };

    let renamed_path = env.path("projects/beta");
    assert_eq!(renamed_record.metadata.path.to_path_buf(), renamed_path);
    assert_eq!(renamed_record.metadata.name, "beta");
    assert!(!workspace_dir.exists());
    assert!(renamed_path.exists());

    let moved_path = env.path("archives/gamma");
    let moved_record = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .set_workspace_path(&workspace_id, &WorkspacePath::from(moved_path.as_os_str()), true)
            .expect("move workspace")
    };

    assert_eq!(moved_record.metadata.path.to_path_buf(), moved_path);
    assert_eq!(moved_record.metadata.name, "gamma");
    assert!(!renamed_path.exists());
    assert!(moved_path.exists());

    {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .remove_workspace(&workspace_id, true)
            .expect("remove workspace");
        assert!(workspace_registry.get_workspace_record(&workspace_id).is_none());
        assert!(workspace_registry.get_last_workspace_id().is_none());
    }

    assert!(!moved_path.exists());
}
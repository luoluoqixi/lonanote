use relative_path::RelativePathBuf;

use crate::workspace::{
    get_workspace_registry, get_workspace_registry_mut,
    workspace_locator::{WorkspaceLocator, WorkspaceRoot, WorkspaceRootKind, WorkspaceRootSource},
};

use super::support::{
    create_external_workspace, create_external_workspace_without_id, TestWorkspaceEnv,
};

#[tokio::test(flavor = "current_thread")]
async fn sync_workspace_roots_imports_and_relocates_workspaces() {
    let env = TestWorkspaceEnv::new("roots-sync").await;
    let root_base = env.path("mobile-documents");
    let normalized_root_path = root_base.join("workspaces");

    {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .set_workspace_roots(vec![WorkspaceRoot {
                key: String::from("mobile-docs"),
                path: root_base.clone(),
                kind: WorkspaceRootKind::MobileAppSandbox,
                source: WorkspaceRootSource::SystemDefault,
            }])
            .expect("set workspace roots");

        let roots = workspace_registry.get_workspace_roots();
        assert_eq!(roots.len(), 1);
        assert_eq!(roots[0].path, normalized_root_path);
    }

    let managed_record = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .create_workspace_in_root("mobile-docs", "alpha")
            .expect("create workspace in root")
    };

    assert_eq!(
        managed_record.metadata.path.to_path_buf(),
        normalized_root_path.join("alpha")
    );

    let imported_workspace_id = create_external_workspace(&normalized_root_path.join("external"));

    let relocated_path = normalized_root_path.join("alpha-relocated");
    std::fs::rename(normalized_root_path.join("alpha"), &relocated_path)
        .expect("relocate workspace dir");

    let summary = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .sync_workspace_roots()
            .expect("sync workspace roots")
    };

    assert_eq!(summary.imported_count, 1);
    assert_eq!(summary.relocated_count, 1);

    {
        let workspace_registry = get_workspace_registry().await;

        let relocated_record = workspace_registry
            .get_workspace_record(&managed_record.metadata.id)
            .expect("get relocated workspace record");
        assert_eq!(relocated_record.metadata.path.to_path_buf(), relocated_path);
        assert_eq!(relocated_record.metadata.name, "alpha-relocated");
        assert_eq!(
            relocated_record.locator,
            WorkspaceLocator::ManagedRoot {
                root_key: String::from("mobile-docs"),
                relative_path: RelativePathBuf::from("alpha-relocated"),
            }
        );

        let imported_record = workspace_registry
            .get_workspace_record(&imported_workspace_id)
            .expect("get imported workspace record");
        assert_eq!(
            imported_record.metadata.path.to_path_buf(),
            normalized_root_path.join("external")
        );
        assert_eq!(imported_record.metadata.name, "external");
        assert_eq!(
            imported_record.locator,
            WorkspaceLocator::ManagedRoot {
                root_key: String::from("mobile-docs"),
                relative_path: RelativePathBuf::from("external"),
            }
        );
    }
}

#[tokio::test(flavor = "current_thread")]
async fn sync_workspace_roots_skips_workspace_without_id() {
    let env = TestWorkspaceEnv::new("roots-skip-empty-id").await;
    let root_base = env.path("mobile-documents");
    let normalized_root_path = root_base.join("workspaces");

    {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .set_workspace_roots(vec![WorkspaceRoot {
                key: String::from("mobile-docs"),
                path: root_base.clone(),
                kind: WorkspaceRootKind::MobileAppSandbox,
                source: WorkspaceRootSource::SystemDefault,
            }])
            .expect("set workspace roots");
    }

    create_external_workspace_without_id(&normalized_root_path.join("missing-id"));

    let summary = {
        let mut workspace_registry = get_workspace_registry_mut().await;
        workspace_registry
            .sync_workspace_roots()
            .expect("sync workspace roots")
    };

    assert_eq!(summary.imported_count, 0);
    assert_eq!(summary.relocated_count, 0);

    {
        let workspace_registry = get_workspace_registry().await;
        assert!(workspace_registry.list_workspace_records().is_empty());
    }
}
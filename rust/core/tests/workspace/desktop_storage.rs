use crate::{
    support::{external_binding, provider, WorkspaceTestApp, MANAGED_PROVIDER},
    window_sessions::WindowSessions,
    workspace_storage_transaction::change_storage,
};
use lonanote_core::workspace::{WorkspaceId, WorkspaceStorageTarget};

fn sessions(id: WorkspaceId) -> WindowSessions {
    let sessions = WindowSessions::default();
    sessions.register_window("a");
    sessions.register_window("b");
    sessions.reserve_open("a", id).unwrap();
    sessions.commit_open("a", id).unwrap();
    sessions
}

#[tokio::test]
async fn relocation_keeps_owner_until_reopened() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "A".into())
        .await
        .unwrap();
    let id = created.id;
    let sessions = sessions(id);
    let target = app.external_dir("moved");
    let result = change_storage(&manager, &sessions, "a", id, || async {
        assert!(!manager.is_workspace_open(&id).await);
        assert_eq!(sessions.current_workspace("a"), Some(id));
        assert!(sessions.reserve_open("b", id).is_err());
        manager
            .relocate_workspace(
                &id,
                WorkspaceStorageTarget::External {
                    binding: external_binding(&target),
                },
            )
            .await
            .map(|r| Some(r.source_cleanup))
            .map_err(|e| e.to_string())
    })
    .await
    .unwrap();
    assert!(result.was_open && result.reopened);
    assert!(result.reopen_error.is_none());
    assert!(result.source_cleanup.is_some());
    assert!(manager.is_workspace_open(&id).await);
    assert_eq!(sessions.owner_of(id).as_deref(), Some("a"));
}

#[tokio::test]
async fn foreign_window_cannot_close_or_modify_owned_workspace() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "A".into())
        .await
        .unwrap();
    let sessions = sessions(created.id);
    let result = change_storage(&manager, &sessions, "b", created.id, || async {
        panic!("其他窗口不能执行存储修改");
    })
    .await;
    assert!(result.is_err());
    assert!(manager.is_workspace_open(&created.id).await);
    assert_eq!(sessions.current_workspace("a"), Some(created.id));
}

#[tokio::test]
async fn failed_change_restores_original_instance_and_owner() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "A".into())
        .await
        .unwrap();
    let sessions = sessions(created.id);
    let error = change_storage(&manager, &sessions, "a", created.id, || async {
        Err("迁移失败".into())
    })
    .await
    .err()
    .unwrap();
    assert_eq!(error, "迁移失败");
    assert!(manager.is_workspace_open(&created.id).await);
    assert_eq!(sessions.current_workspace("a"), Some(created.id));
}

#[tokio::test]
async fn failed_reopen_releases_owner_after_committed_change() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let created = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "A".into())
        .await
        .unwrap();
    let sessions = sessions(created.id);
    let result = change_storage(&manager, &sessions, "a", created.id, || async {
        // 只破坏临时测试目录中的 Manifest，模拟提交后存储不可访问。
        std::fs::write(
            app.managed_workspace_root(&created)
                .join(".lonanote/manifest.json"),
            "invalid",
        )
        .unwrap();
        Ok(None)
    })
    .await
    .unwrap();
    assert!(result.was_open && !result.reopened);
    assert!(result.reopen_error.is_some());
    assert!(!manager.is_workspace_open(&created.id).await);
    assert_eq!(sessions.current_workspace("a"), None);
    assert!(sessions.reserve_open("b", created.id).is_ok());
}

#[tokio::test]
async fn rebind_closed_workspace_preserves_current_workspace() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let a = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "A".into())
        .await
        .unwrap();
    let c = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "C".into())
        .await
        .unwrap();
    manager.close_workspace(&c.id).await.unwrap();
    let sessions = sessions(a.id);
    let target = app.external_dir("rebound").join("C");
    std::fs::rename(app.managed_workspace_root(&c), &target).unwrap();
    let result = change_storage(&manager, &sessions, "a", c.id, || async {
        manager
            .rebind_workspace(&c.id, external_binding(&target))
            .await
            .map(|_| None)
            .map_err(|e| e.to_string())
    })
    .await
    .unwrap();
    assert!(!result.was_open && !result.reopened);
    assert!(manager.is_workspace_open(&a.id).await);
    assert!(!manager.is_workspace_open(&c.id).await);
    assert_eq!(sessions.current_workspace("a"), Some(a.id));
    assert_eq!(sessions.owner_of(c.id), None);
}

use crate::setup::{
    window_runtime::WINDOW_SESSIONS,
    workspace_access::check_workspace_access,
    workspace_storage_transaction::{change_storage, StorageChangeResult},
};
use lonanote_core::workspace::{
    workspace_manager, WorkspaceId, WorkspaceStorageBindingRequest, WorkspaceStorageTarget,
};
use tauri::{Emitter, WebviewWindow};

#[derive(serde::Deserialize)]
#[serde(tag = "mode", rename_all = "camelCase")]
pub enum StorageChange {
    Relocate {
        target: WorkspaceStorageTarget,
    },
    Rebind {
        binding: WorkspaceStorageBindingRequest,
    },
}

#[tauri::command]
pub async fn assert_workspace_editable(
    window: WebviewWindow,
    workspace_id: WorkspaceId,
) -> Result<(), String> {
    let _guard = super::window_workspace_api::WORKSPACE_GATE.read().await;
    if WINDOW_SESSIONS.start_cause(window.label()).is_none() {
        return Err("窗口会话已结束".into());
    }
    check_workspace_access(
        &WINDOW_SESSIONS,
        window.label(),
        "workspace.update_display_name",
        workspace_id,
    )
}

#[tauri::command]
pub async fn change_workspace_storage(
    window: WebviewWindow,
    workspace_id: WorkspaceId,
    change: StorageChange,
) -> Result<StorageChangeResult, String> {
    let _guard = super::window_workspace_api::WORKSPACE_GATE.write().await;
    if crate::setup::window_close::CLOSE_ACTIVE.load(std::sync::atomic::Ordering::SeqCst) {
        return Err("正在确认窗口关闭，请稍后重试".into());
    }
    let manager = workspace_manager();
    let result = change_storage(
        manager,
        &WINDOW_SESSIONS,
        window.label(),
        workspace_id,
        || async {
            match change {
                StorageChange::Relocate { target } => manager
                    .relocate_workspace(&workspace_id, target)
                    .await
                    .map(|r| Some(r.source_cleanup)),
                StorageChange::Rebind { binding } => manager
                    .rebind_workspace(&workspace_id, binding)
                    .await
                    .map(|_| None),
            }
            .map_err(|e| e.to_string())
        },
    )
    .await;
    if let Err(error) = window.emit("lonanote://workspace-catalog-changed", ()) {
        log::warn!("广播存储变更结果失败：{error}");
    }
    result
}

use lonanote_core::{
    workspace::{workspace_manager, WorkspaceId},
    CommandContext, CommandResponse,
};
use serde_json::Value;
use tauri::{Emitter, Manager, WebviewWindow};

use crate::setup::{
    window_runtime::WINDOW_SESSIONS,
    workspace_access::{
        check_workspace_access, should_focus_workspace_owner, should_notify_catalog_changed,
    },
};

// 生命周期修改与文件操作互斥；不同工作区的普通文件请求仍可并发执行。
pub static WORKSPACE_GATE: tokio::sync::RwLock<()> = tokio::sync::RwLock::const_new(());

pub async fn invoke_workspace(
    window: &WebviewWindow,
    key: &str,
    args: CommandContext<'_>,
    data: &Value,
) -> Result<CommandResponse, String> {
    let label = window.label();
    if WINDOW_SESSIONS.start_cause(label).is_none() {
        return Err("当前窗口尚未注册工作台会话".to_string());
    }
    let file_operation = key.starts_with("workspace.file.") || key.starts_with("workspace.index.");
    if file_operation {
        if key == "workspace.file.transfer" {
            // 转移与文件占用交接互斥，检查后不能被其他窗口抢先打开来源。
            let _guard = WORKSPACE_GATE.write().await;
            let id = workspace_id(data).ok_or("缺少有效的 workspaceId")?;
            check_workspace_access(&WINDOW_SESSIONS, label, key, id)?;
            super::file_ownership_api::assert_transfer_access(label, id, data).await?;
            return lonanote_core::invoke_command_async(key, args)
                .await
                .map_err(|error| error.to_string());
        }
        let _guard = WORKSPACE_GATE.read().await;
        let id = workspace_id(data).ok_or("缺少有效的 workspaceId")?;
        check_workspace_access(&WINDOW_SESSIONS, label, key, id)?;
        return lonanote_core::invoke_command_async(key, args)
            .await
            .map_err(|error| error.to_string());
    }
    let _guard = WORKSPACE_GATE.write().await;
    let requested_id = workspace_id(data);
    if let Some(id) = requested_id {
        if let Err(error) = check_workspace_access(&WINDOW_SESSIONS, label, key, id) {
            if should_focus_workspace_owner(key) {
                log::info!(
                    "workspace open conflict: caller={label}, command={key}, owner={:?}",
                    WINDOW_SESSIONS.owner_of(id)
                );
                focus_owner(window, id);
            }
            return Err(error);
        }
    }
    let opening = matches!(
        key,
        "workspace.open"
            | "workspace.open_with_diagnostics"
            | "workspace.resolve_id_mismatch"
            | "workspace.create_managed"
            | "workspace.create_external"
    );
    if opening {
        if let Some(id) = requested_id {
            WINDOW_SESSIONS
                .reserve_open(label, id)
                .map_err(|error| error.to_string())?;
        }
    }
    let response = lonanote_core::invoke_command_async(key, args)
        .await
        .map_err(|error| error.to_string());
    if opening {
        match &response {
            Ok(response) => {
                let opened_id = opened_workspace_id(key, response);
                if let Some(id) = opened_id {
                    // ID 修复与新建可能返回新的身份，必须按实际结果绑定。
                    if requested_id != Some(id) {
                        if let Some(requested) = requested_id {
                            WINDOW_SESSIONS.rollback_open(label, requested);
                        }
                        WINDOW_SESSIONS
                            .reserve_open(label, id)
                            .map_err(|error| error.to_string())?;
                    }
                    if let Some(previous) = WINDOW_SESSIONS
                        .current_workspace(label)
                        .filter(|previous| *previous != id)
                    {
                        if let Err(error) = workspace_manager().close_workspace(&previous).await {
                            let _ = workspace_manager().close_workspace(&id).await;
                            WINDOW_SESSIONS.rollback_open(label, id);
                            return Err(error.to_string());
                        }
                    }
                    WINDOW_SESSIONS
                        .commit_open(label, id)
                        .map_err(|error| error.to_string())?;
                } else if let Some(id) = requested_id {
                    WINDOW_SESSIONS.rollback_open(label, id);
                }
            }
            Err(_) => {
                if let Some(id) = requested_id {
                    WINDOW_SESSIONS.rollback_open(label, id);
                }
            }
        }
    }
    if response.is_ok() {
        if matches!(key, "workspace.close" | "workspace.remove") {
            if let Some(id) = requested_id {
                WINDOW_SESSIONS
                    .release_workspace(label, id)
                    .map_err(|error| error.to_string())?;
            }
        }
        // Catalog 是全局投影；本窗口完成命令后也使用同一刷新协议。
        if should_notify_catalog_changed(key) {
            if let Err(error) = window
                .app_handle()
                .emit("lonanote://workspace-catalog-changed", ())
            {
                log::warn!("广播工作区 Catalog 变化失败：{error}");
            }
        }
    }
    response
}

fn workspace_id(data: &Value) -> Option<WorkspaceId> {
    data.get("workspaceId")
        .and_then(Value::as_str)
        .and_then(|id| WorkspaceId::parse(id).ok())
}

fn opened_workspace_id(key: &str, response: &CommandResponse) -> Option<WorkspaceId> {
    let CommandResponse::Json(json) = response else {
        return None;
    };
    let value: Value = serde_json::from_str(json).ok()?;
    let snapshot = if key == "workspace.open_with_diagnostics" {
        if value.get("status")?.as_str()? != "opened" {
            return None;
        }
        value.get("workspace")?
    } else {
        &value
    };
    snapshot
        .get("id")?
        .as_str()
        .and_then(|id| WorkspaceId::parse(id).ok())
}

fn focus_owner(window: &WebviewWindow, id: WorkspaceId) {
    if let Some(owner) = WINDOW_SESSIONS
        .owner_of(id)
        .and_then(|label| window.app_handle().get_webview_window(&label))
    {
        let _ = owner.unminimize();
        let _ = owner.show();
        let _ = owner.set_focus();
    }
}

pub fn cleanup_window(app: tauri::AppHandle, label: String) {
    super::window_callbacks::cleanup_callbacks(&label);
    let epoch = crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .epoch(&label);
    tauri::async_runtime::spawn(async move {
        let _guard = WORKSPACE_GATE.write().await;
        let (removed, hidden) = {
            let mut sessions = crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            if epoch.is_some_and(|epoch| sessions.epoch(&label) != Some(epoch)) {
                return;
            }
            let hidden = sessions.hidden_members(&label);
            let notices = epoch
                .map(|epoch| sessions.orphan_owner_if_epoch(&label, epoch))
                .unwrap_or_default();
            (notices, hidden)
        };
        // 尚未显示的转移目标未接管输入，可以直接清理。
        for member in hidden {
            if let Some(window) = app.get_webview_window(&member) {
                let _ = window.destroy();
            }
        }
        // owner 异常消失不能销毁辅助 surface：它可能仍持有尚未 ACK 的输入。
        // 保留只读恢复窗口，用户复制/导出或明确放弃后再独立关闭。
        for notice in removed {
            let _ = app.emit_to(
                tauri::EventTarget::webview_window(&notice.window_label),
                "lonanote://editor-window-owner-destroyed",
                &notice,
            );
        }
        // 等待所有在途 claim 完成后清理，防止已销毁窗口重新留下文件占用。
        super::file_ownership_api::release_window(&label);
        if let Some(id) = WINDOW_SESSIONS.current_workspace(&label) {
            if let Err(error) = workspace_manager().close_workspace(&id).await {
                log::error!("销毁窗口后关闭工作区失败：{error}");
            }
        }
        WINDOW_SESSIONS.release_window(&label);
        if let Err(error) = app.emit("lonanote://workspace-catalog-changed", ()) {
            log::warn!("广播窗口销毁后的 Catalog 变化失败：{error}");
        }
    });
}

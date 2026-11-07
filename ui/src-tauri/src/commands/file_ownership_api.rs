use crate::setup::{
    file_ownership::{FileIdentity, FileOwner, FileOwnership},
    window_runtime::WINDOW_SESSIONS,
};
use lonanote_core::workspace::{workspace_manager, WorkspaceId, WorkspaceRelativePath};
use std::{
    path::PathBuf,
    sync::{LazyLock, Mutex},
};
use tauri::{Emitter, Manager, WebviewWindow};

pub(super) static FILES: LazyLock<Mutex<FileOwnership>> =
    LazyLock::new(|| Mutex::new(FileOwnership::default()));

#[derive(Clone, serde::Deserialize, serde::Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum FileReference {
    WorkspaceFile {
        workspace_id: WorkspaceId,
        file_path: WorkspaceRelativePath,
    },
    LooseFile {
        absolute_path: String,
    },
}

#[tauri::command]
pub async fn claim_document_file(
    window: WebviewWindow,
    document_id: String,
    lease_id: String,
    reference: FileReference,
    owner_epoch: Option<u64>,
) -> Result<(), String> {
    let _guard = super::window_workspace_api::WORKSPACE_GATE.read().await;
    let path = match reference {
        FileReference::WorkspaceFile {
            workspace_id,
            file_path,
        } => {
            crate::setup::workspace_access::check_workspace_access(
                &WINDOW_SESSIONS,
                window.label(),
                "workspace.file.native_path",
                workspace_id,
            )?;
            PathBuf::from(
                workspace_manager()
                    .native_path(&workspace_id, &file_path)
                    .await
                    .map_err(|error| error.to_string())?
                    .ok_or("当前 Storage Provider 未提供本地文件路径")?,
            )
        }
        FileReference::LooseFile { absolute_path } => {
            let path = PathBuf::from(absolute_path)
                .canonicalize()
                .map_err(|e| e.to_string())?;
            super::document_save_api::classify_target(window.label(), &path).await?;
            path
        }
    };
    if !path.is_absolute() {
        return Err("文件路径必须是绝对路径".to_string());
    }
    let identity = tauri::async_runtime::spawn_blocking(move || FileIdentity::resolve(&path))
        .await
        .map_err(|error| error.to_string())?
        .map_err(|error| error.to_string())?;
    if WINDOW_SESSIONS.start_cause(window.label()).is_none() {
        return Err("窗口会话已结束".to_string());
    }
    let owner = FileOwner {
        window_label: window.label().to_string(),
        document_id,
        lease_id,
    };
    let sessions = crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    sessions.authorize_claim_epoch(window.label(), owner_epoch)?;
    let result = FILES
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .claim(identity, owner);
    drop(sessions);
    if let Err(owner) = result {
        if let Some(target) = window.app_handle().get_webview_window(&owner.window_label) {
            let _ = target.unminimize();
            let _ = target.show();
            let _ = target.set_focus();
            let _ = target.emit_to(
                tauri::EventTarget::webview_window(target.label()),
                "lonanote://focus-document",
                &owner.document_id,
            );
        }
        return Err("该文件已在另一个编辑器中打开".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn release_document_file(
    window: WebviewWindow,
    lease_id: Option<String>,
    document_id: Option<String>,
    owner_epoch: Option<u64>,
) {
    let _guard = super::window_workspace_api::WORKSPACE_GATE.write().await;
    let sessions = crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    if sessions
        .authorize_claim_epoch(window.label(), owner_epoch)
        .is_err()
    {
        return;
    }
    let mut files = FILES.lock().unwrap_or_else(|error| error.into_inner());
    if let Some(document) = document_id {
        files.release_document(window.label(), &document);
    } else if let Some(lease) = lease_id {
        files.release(window.label(), &lease);
    }
}

pub fn release_window(label: &str) {
    super::document_save_api::release_window(label);
    FILES
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .release_window(label);
}

pub async fn assert_transfer_access(
    window: &str,
    id: WorkspaceId,
    data: &serde_json::Value,
) -> Result<(), String> {
    let sources: Vec<lonanote_core::workspace::TransferSource> =
        serde_json::from_value(data.get("sources").cloned().ok_or("缺少来源")?)
            .map_err(|e| e.to_string())?;
    let mut roots = Vec::new();
    let mut overwrite_roots = Vec::new();
    if let Some(root) = workspace_manager()
        .native_root_path(&id)
        .await
        .map_err(|e| e.to_string())?
    {
        let destination: lonanote_core::workspace::WorkspaceRelativePath = serde_json::from_value(
            data.get("destinationDirectory")
                .cloned()
                .ok_or("缺少目标目录")?,
        )
        .map_err(|e| e.to_string())?;
        for source in sources {
            roots.push(PathBuf::from(&root).join(source.path.as_str()));
            if data.get("conflictPolicy").and_then(|v| v.as_str()) == Some("overwrite") {
                if let Some(name) = source.path.file_name() {
                    let target = destination.join_name(&name);
                    if target != source.path {
                        overwrite_roots.push(PathBuf::from(&root).join(target.as_str()));
                    }
                }
            }
        }
    }
    super::document_save_api::assert_no_pending_targets(&roots)?;
    super::document_save_api::assert_no_pending_targets(&overwrite_roots)?;
    let files = FILES.lock().unwrap_or_else(|e| e.into_inner());
    files.assert_transfer_access(window, &roots)?;
    files.assert_overwrite_access(&overwrite_roots)
}

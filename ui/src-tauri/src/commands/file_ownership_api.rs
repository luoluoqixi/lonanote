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

static FILES: LazyLock<Mutex<FileOwnership>> =
    LazyLock::new(|| Mutex::new(FileOwnership::default()));

#[derive(serde::Deserialize)]
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
        FileReference::LooseFile { absolute_path } => PathBuf::from(absolute_path),
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
    let result = FILES
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .claim(identity, owner);
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
) {
    let _guard = super::window_workspace_api::WORKSPACE_GATE.write().await;
    let mut files = FILES.lock().unwrap_or_else(|error| error.into_inner());
    if let Some(document) = document_id {
        files.release_document(window.label(), &document);
    } else if let Some(lease) = lease_id {
        files.release(window.label(), &lease);
    }
}

pub fn release_window(label: &str) {
    FILES
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .release_window(label);
}

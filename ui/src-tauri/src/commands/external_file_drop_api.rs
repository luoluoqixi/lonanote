use super::{
    document_save_api::classify_target, file_ownership_api::FileReference,
    window_workspace_api::WORKSPACE_GATE,
};
use crate::setup::{external_file_drop, window_runtime::EDITOR_WINDOW_SESSIONS};
use std::path::Path;
use tauri::WebviewWindow;

async fn open_reference(label: &str, path: &Path) -> Result<FileReference, String> {
    let path = path.canonicalize().map_err(|e| e.to_string())?;
    if !path.is_file() {
        return Err("只能打开文件，不能打开文件夹".into());
    }
    classify_target(label, &path).await
}

#[tauri::command]
pub async fn resolve_document_open_reference(
    window: WebviewWindow,
    absolute_path: String,
    owner_epoch: Option<u64>,
) -> Result<FileReference, String> {
    let _gate = WORKSPACE_GATE.read().await;
    {
        let sessions = EDITOR_WINDOW_SESSIONS
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        sessions.authorize_claim_epoch(window.label(), owner_epoch)?;
        if sessions.owner_of(window.label()) != Some(window.label()) {
            return Err("窗口会话已结束".into());
        }
    }
    open_reference(window.label(), Path::new(&absolute_path)).await
}

#[tauri::command]
pub async fn take_external_file_drop(
    window: WebviewWindow,
    token: String,
    source_window_label: String,
    owner_epoch: Option<u64>,
) -> Result<Vec<FileReference>, String> {
    let _gate = WORKSPACE_GATE.read().await;
    let paths = {
        let sessions = EDITOR_WINDOW_SESSIONS
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        sessions.authorize_claim_epoch(window.label(), owner_epoch)?;
        if sessions.owner_of(&source_window_label) != Some(window.label()) {
            return Err("文件拖放不属于当前工作台".into());
        }
        let (_, session_id, epoch) = sessions.drag_session(&source_window_label)?;
        external_file_drop::DROPS
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .take(
                &token,
                &source_window_label,
                window.label(),
                &session_id,
                epoch,
            )?
    };
    let mut refs = Vec::new();
    for path in paths {
        let extension = path
            .extension()
            .and_then(|v| v.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if !["md", "markdown", "mdx", "txt"].contains(&extension.as_str()) || !path.is_file() {
            continue;
        }
        refs.push(open_reference(window.label(), &path).await?);
    }
    Ok(refs)
}

#[tauri::command]
pub async fn capture_external_file_drop(
    window: WebviewWindow,
    names: Vec<String>,
    x: f64,
    y: f64,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let (sender, receiver) = tokio::sync::oneshot::channel();
        window
            .run_on_main_thread(move || {
                let _ = sender.send(external_file_drop::macos_drag_paths());
            })
            .map_err(|e| e.to_string())?;
        let paths = receiver.await.map_err(|e| e.to_string())?;
        let mut actual = paths
            .iter()
            .map(|p| {
                p.file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned()
            })
            .collect::<Vec<_>>();
        let mut expected = names;
        actual.sort();
        expected.sort();
        if actual != expected || paths.is_empty() {
            return Err("无法读取本次文件拖放路径，请重新拖动".into());
        }
        external_file_drop::publish(&window, paths, x, y, false)
    }
    #[cfg(windows)]
    {
        // 确认合法 Tauri envelope，路径由随后执行的 WebView2 AdditionalObjects handler 读取。
        // 此命令不接收路径，也不允许仅凭文件名生成拖放凭据。
        let _ = (window, names, x, y);
        Ok(())
    }
    #[cfg(not(any(target_os = "macos", windows)))]
    {
        let _ = (window, names, x, y);
        Err("当前 WebView 不支持读取拖放文件路径，请使用打开文件".into())
    }
}

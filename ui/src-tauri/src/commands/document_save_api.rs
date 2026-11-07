use super::{
    file_ownership_api::{FileReference, FILES},
    window_workspace_api::WORKSPACE_GATE,
};
use crate::setup::document_save_paths::{is_within, normalized_target};
use crate::setup::{
    file_ownership::{FileIdentity, FileOwner},
    window_runtime::WINDOW_SESSIONS,
};
use lonanote_core::workspace::{workspace_manager, WorkspaceRelativePath};
use std::{
    collections::HashMap,
    io::{Read, Seek, Write},
    path::{Path, PathBuf},
    sync::{LazyLock, Mutex},
};
use tauri::WebviewWindow;

struct PreparedTarget {
    owner: FileOwner,
    owner_epoch: Option<u64>,
    path: PathBuf,
    reference: FileReference,
    // 已存在文件保留句柄；提交前同时检查路径身份与完整内容，拒绝迟到覆盖。
    existing: Option<(std::fs::File, Vec<u8>)>,
}
static TARGETS: LazyLock<Mutex<HashMap<String, PreparedTarget>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreparedSaveTarget {
    token: String,
    reference: FileReference,
    exists: bool,
}

pub(super) async fn classify_target(window: &str, path: &Path) -> Result<FileReference, String> {
    let mut reference = FileReference::LooseFile {
        absolute_path: path.to_string_lossy().into_owned(),
    };
    for item in workspace_manager().list_workspaces().await {
        if !item.is_open {
            continue;
        }
        let Some(root) = workspace_manager()
            .native_root_path(&item.id)
            .await
            .map_err(|e| e.to_string())?
        else {
            continue;
        };
        let root = PathBuf::from(root)
            .canonicalize()
            .map_err(|e| e.to_string())?;
        // Windows 的 canonicalize 统一实际目录大小写；最终文件名不影响根前缀判断。
        if let Ok(relative) = path.strip_prefix(root) {
            if WINDOW_SESSIONS.current_workspace(window) != Some(item.id) {
                return Err("保存目标属于另一个窗口打开的工作区".into());
            }
            let relative = relative.to_string_lossy().replace('\\', "/");
            let file_path = WorkspaceRelativePath::parse(&relative).map_err(|e| e.to_string())?;
            if relative.split('/').any(|segment| segment == ".lonanote") {
                return Err("不能保存到工作区内部配置目录".into());
            }
            reference = FileReference::WorkspaceFile {
                workspace_id: item.id,
                file_path,
            };
        }
    }
    Ok(reference)
}

#[tauri::command]
pub async fn prepare_document_save_target(
    window: WebviewWindow,
    document_id: String,
    lease_id: String,
    absolute_path: String,
    owner_epoch: Option<u64>,
) -> Result<PreparedSaveTarget, String> {
    let _guard = WORKSPACE_GATE.write().await;
    if WINDOW_SESSIONS.start_cause(window.label()).is_none() {
        return Err("窗口会话已结束".into());
    }
    authorize_owner(window.label(), owner_epoch)?;
    let path = normalized_target(Path::new(&absolute_path))?;
    let reference = classify_target(window.label(), &path).await?;
    let identity = FileIdentity::resolve_target(&path).map_err(|e| e.to_string())?;
    let existing = if path.exists() {
        let mut file = std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .open(&path)
            .map_err(|e| e.to_string())?;
        let mut contents = Vec::new();
        file.read_to_end(&mut contents).map_err(|e| e.to_string())?;
        Some((file, contents))
    } else {
        None
    };
    let owner = FileOwner {
        window_label: window.label().into(),
        document_id,
        lease_id,
    };
    FILES
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .claim(identity, owner.clone())
        .map_err(|_| "该文件已在另一个编辑器中打开")?;
    let token = uuid::Uuid::new_v4().to_string();
    let result = PreparedSaveTarget {
        token: token.clone(),
        reference: reference.clone(),
        exists: existing.is_some(),
    };
    TARGETS.lock().unwrap_or_else(|e| e.into_inner()).insert(
        token,
        PreparedTarget {
            owner,
            owner_epoch,
            path,
            reference,
            existing,
        },
    );
    Ok(result)
}

#[tauri::command]
pub async fn abort_document_save_target(
    window: WebviewWindow,
    token: String,
    owner_epoch: Option<u64>,
) {
    let _guard = WORKSPACE_GATE.write().await;
    if authorize_owner(window.label(), owner_epoch).is_err() {
        return;
    }
    let mut targets = TARGETS.lock().unwrap_or_else(|e| e.into_inner());
    if targets
        .get(&token)
        .is_some_and(|p| p.owner.window_label == window.label() && p.owner_epoch == owner_epoch)
    {
        if let Some(target) = targets.remove(&token) {
            FILES
                .lock()
                .unwrap_or_else(|e| e.into_inner())
                .release(window.label(), &target.owner.lease_id);
        }
    }
}

#[tauri::command]
pub async fn commit_document_save_target(
    window: WebviewWindow,
    token: String,
    text: String,
    overwrite: bool,
    owner_epoch: Option<u64>,
) -> Result<FileReference, String> {
    let _guard = WORKSPACE_GATE.write().await;
    authorize_owner(window.label(), owner_epoch)?;
    let mut target = {
        let mut targets = TARGETS.lock().unwrap_or_else(|e| e.into_inner());
        if !targets
            .get(&token)
            .is_some_and(|p| p.owner.window_label == window.label() && p.owner_epoch == owner_epoch)
        {
            return Err("保存目标预占已失效".into());
        }
        targets.remove(&token).ok_or("保存目标预占已失效")?
    };
    let result = async {
        if WINDOW_SESSIONS.start_cause(window.label()).is_none() {
            return Err("窗口会话已结束".into());
        }
        if normalized_target(&target.path)? != target.path {
            return Err("保存目标父目录已变化，请重新选择位置".into());
        }
        let reference = classify_target(window.label(), &target.path).await?;
        if serde_json::to_value(&reference).ok() != serde_json::to_value(&target.reference).ok() {
            return Err("目标工作区已变化，请重新保存".into());
        }
        // 复验占用，避免准备后其他身份操作替换预占。
        FILES
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .claim(
                FileIdentity::resolve_target(&target.path).map_err(|e| e.to_string())?,
                target.owner.clone(),
            )
            .map_err(|_| "目标文件已被其他文档占用")?;
        if let Some((file, contents)) = &mut target.existing {
            if !overwrite {
                return Err("覆盖文件需要明确确认".into());
            }
            let opened = same_file::Handle::from_file(file.try_clone().map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
            let current = same_file::Handle::from_path(&target.path).map_err(|e| e.to_string())?;
            if opened != current {
                return Err("目标文件身份已变化，请重新保存".into());
            }
            file.rewind().map_err(|e| e.to_string())?;
            let mut latest = Vec::new();
            file.read_to_end(&mut latest).map_err(|e| e.to_string())?;
            if &latest != contents {
                return Err("目标文件内容已变化，请重新保存".into());
            }
            file.rewind().map_err(|e| e.to_string())?;
            file.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
            file.set_len(text.len() as u64).map_err(|e| e.to_string())?;
            file.sync_all().map_err(|e| e.to_string())?;
        } else {
            let mut file = std::fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&target.path)
                .map_err(|e| e.to_string())?;
            if let Err(error) = file
                .write_all(text.as_bytes())
                .and_then(|()| file.sync_all())
            {
                drop(file);
                let _ = std::fs::remove_file(&target.path);
                return Err(error.to_string());
            }
        }
        FILES
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .claim(
                FileIdentity::resolve(&target.path).map_err(|e| e.to_string())?,
                target.owner.clone(),
            )
            .map_err(|_| "提交文件占用失败")?;
        Ok(reference)
    }
    .await;
    if result.is_err() {
        FILES
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .release(window.label(), &target.owner.lease_id);
    }
    result
}

pub fn release_window(label: &str) {
    TARGETS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .retain(|_, target| target.owner.window_label != label);
}

pub fn assert_no_pending_targets(roots: &[PathBuf]) -> Result<(), String> {
    let targets = TARGETS.lock().unwrap_or_else(|e| e.into_inner());
    if targets
        .values()
        .any(|target| roots.iter().any(|root| is_within(&target.path, root)))
    {
        return Err("来源中有正在保存的文档，请稍后重试".into());
    }
    Ok(())
}

fn authorize_owner(label: &str, epoch: Option<u64>) -> Result<(), String> {
    crate::setup::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .authorize_claim_epoch(label, epoch)
}

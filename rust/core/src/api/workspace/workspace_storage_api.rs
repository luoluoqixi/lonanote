use anyhow::Result;
use cmdreg::{command, Json};
use serde::Deserialize;

use crate::workspace::{
    get_workspace_registry, get_workspace_registry_mut,
    storage_mount::{StorageMountId, StorageMountKind, StorageMountRecord},
    workspace_registry::ScanStorageMountRequest,
};

fn parse_mount_id(value: String) -> Result<StorageMountId> {
    StorageMountId::parse(value).map_err(Into::into)
}

#[command("workspace.storage")]
async fn register_mount(Json(mount): Json<StorageMountRecord>) -> Result<()> {
    get_workspace_registry_mut()
        .await
        .register_mount(mount)
        .await?;
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReauthorizeMountArgs {
    mount_id: String,
    kind: StorageMountKind,
}

/// picker/native host 更新 bookmark 或 persisted grant 后调用。
#[command("workspace.storage")]
async fn reauthorize_mount(Json(args): Json<ReauthorizeMountArgs>) -> Result<serde_json::Value> {
    let mount_id = parse_mount_id(args.mount_id)?;
    let mount = get_workspace_registry_mut()
        .await
        .reauthorize_mount(&mount_id, args.kind)
        .await?;
    Ok(serde_json::json!(mount))
}

#[command("workspace.storage")]
async fn remove_mount(mount_id: String) -> Result<()> {
    let mount_id = parse_mount_id(mount_id)?;
    get_workspace_registry_mut()
        .await
        .remove_mount(&mount_id)
        .await?;
    Ok(())
}

#[command("workspace.storage")]
async fn list_mounts() -> Result<serde_json::Value> {
    Ok(serde_json::json!(get_workspace_registry()
        .await
        .list_mounts()))
}

#[command("workspace.storage")]
async fn get_mount_status(mount_id: String) -> Result<serde_json::Value> {
    let mount_id = parse_mount_id(mount_id)?;
    let status = get_workspace_registry()
        .await
        .get_mount_status(&mount_id)
        .await?;
    Ok(serde_json::json!(status))
}

#[command("workspace.storage")]
async fn list_mount_statuses() -> Result<serde_json::Value> {
    Ok(serde_json::json!(
        get_workspace_registry().await.list_mount_statuses().await
    ))
}

/// 扫描指定 managed parent 的 direct children，不会修改 registry。
#[command("workspace.storage")]
async fn scan_mount(Json(request): Json<ScanStorageMountRequest>) -> Result<serde_json::Value> {
    let result = get_workspace_registry().await.scan_mount(request).await?;
    Ok(serde_json::json!(result))
}

use std::sync::Arc;

use anyhow::{anyhow, Result};
use cmdreg::{command, Json};
use serde::Deserialize;

use crate::workspace::{
    get_workspace_runtime,
    storage::{move_entry, StorageError, WorkspaceStorage, WriteOptions},
    workspace_id::WorkspaceId,
    workspace_instance::WorkspaceInstance,
    workspace_relative_path::WorkspaceRelativePath,
};

async fn get_workspace(workspace_id: String) -> Result<Arc<WorkspaceInstance>> {
    let workspace_id = WorkspaceId::parse(workspace_id)?;
    get_workspace_runtime()
        .await
        .get_open_workspace(&workspace_id)
        .ok_or_else(|| anyhow!("Workspace 未打开: {workspace_id}"))
}

async fn get_storage(workspace_id: String) -> Result<Arc<dyn WorkspaceStorage>> {
    Ok(get_workspace(workspace_id).await?.storage())
}

fn parse_path(value: String) -> Result<WorkspaceRelativePath> {
    WorkspaceRelativePath::parse(value).map_err(Into::into)
}

#[command("workspace.file")]
async fn exists(workspace_id: String, path: String) -> Result<bool> {
    get_storage(workspace_id)
        .await?
        .exists(&parse_path(path)?)
        .await
        .map_err(Into::into)
}

#[command("workspace.file")]
async fn capabilities(workspace_id: String) -> Result<serde_json::Value> {
    let capabilities = get_storage(workspace_id).await?.capabilities().await?;
    Ok(serde_json::json!(capabilities))
}

#[command("workspace.file")]
async fn metadata(workspace_id: String, path: String) -> Result<serde_json::Value> {
    let metadata = get_storage(workspace_id)
        .await?
        .metadata(&parse_path(path)?)
        .await?;
    Ok(serde_json::json!(metadata))
}

#[command("workspace.file")]
async fn list_directory(workspace_id: String, path: String) -> Result<serde_json::Value> {
    let entries = get_storage(workspace_id)
        .await?
        .list_dir(&parse_path(path)?)
        .await?;
    Ok(serde_json::json!(entries))
}

#[command("workspace.file")]
async fn read_bytes(workspace_id: String, path: String) -> Result<Vec<u8>> {
    get_storage(workspace_id)
        .await?
        .read(&parse_path(path)?)
        .await
        .map_err(Into::into)
}

#[command("workspace.file")]
async fn read_text(workspace_id: String, path: String) -> Result<String> {
    let data = get_storage(workspace_id)
        .await?
        .read(&parse_path(path)?)
        .await?;
    String::from_utf8(data).map_err(|error| anyhow!("文件不是有效 UTF-8: {error}"))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WriteBytesArgs {
    workspace_id: String,
    path: String,
    data: Vec<u8>,
    #[serde(default = "default_true")]
    overwrite: bool,
    #[serde(default = "default_true")]
    create_parent: bool,
}

#[command("workspace.file")]
async fn write_bytes(Json(args): Json<WriteBytesArgs>) -> Result<()> {
    let workspace = get_workspace(args.workspace_id).await?;
    workspace
        .storage()
        .write(
            &parse_path(args.path)?,
            &args.data,
            WriteOptions {
                overwrite: args.overwrite,
                create_parent: args.create_parent,
            },
        )
        .await?;
    workspace.invalidate_file_tree().await;
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WriteTextArgs {
    workspace_id: String,
    path: String,
    text: String,
    #[serde(default = "default_true")]
    overwrite: bool,
    #[serde(default = "default_true")]
    create_parent: bool,
}

#[command("workspace.file")]
async fn write_text(Json(args): Json<WriteTextArgs>) -> Result<()> {
    let workspace = get_workspace(args.workspace_id).await?;
    workspace
        .storage()
        .write(
            &parse_path(args.path)?,
            args.text.as_bytes(),
            WriteOptions {
                overwrite: args.overwrite,
                create_parent: args.create_parent,
            },
        )
        .await?;
    workspace.invalidate_file_tree().await;
    Ok(())
}

#[command("workspace.file")]
async fn create_directory(workspace_id: String, path: String) -> Result<()> {
    let workspace = get_workspace(workspace_id).await?;
    workspace
        .storage()
        .create_dir_all(&parse_path(path)?)
        .await?;
    workspace.invalidate_file_tree().await;
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RenameArgs {
    workspace_id: String,
    from_path: String,
    to_path: String,
}

#[command("workspace.file")]
async fn rename(Json(args): Json<RenameArgs>) -> Result<()> {
    let workspace = get_workspace(args.workspace_id).await?;
    let from_path = parse_path(args.from_path)?;
    let to_path = parse_path(args.to_path)?;
    if from_path.parent() != to_path.parent() {
        return Err(anyhow!(
            "rename 只能在同一目录内改名；跨目录请使用 workspace.file.move"
        ));
    }
    if !workspace.storage().capabilities().await?.can_rename {
        return Err(StorageError::Unsupported {
            operation: "rename entry",
        }
        .into());
    }
    workspace.storage().rename(&from_path, &to_path).await?;
    workspace.invalidate_file_tree().await;
    Ok(())
}

#[command("workspace.file")]
async fn r#move(Json(args): Json<RenameArgs>) -> Result<()> {
    let workspace = get_workspace(args.workspace_id).await?;
    move_entry(
        workspace.storage().as_ref(),
        &parse_path(args.from_path)?,
        &parse_path(args.to_path)?,
    )
    .await?;
    workspace.invalidate_file_tree().await;
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoveArgs {
    workspace_id: String,
    path: String,
    #[serde(default)]
    recursive: bool,
}

#[command("workspace.file")]
async fn remove(Json(args): Json<RemoveArgs>) -> Result<()> {
    let workspace = get_workspace(args.workspace_id).await?;
    workspace
        .storage()
        .remove(&parse_path(args.path)?, args.recursive)
        .await?;
    workspace.invalidate_file_tree().await;
    Ok(())
}

const fn default_true() -> bool {
    true
}

use cmdreg::command;

use crate::workspace::{
    workspace_manager, StorageCapabilities, StorageEntry, StorageEntryMetadata, WorkspaceId,
    WorkspaceRelativePath, WriteOptions,
};

#[command("workspace.file")]
async fn capabilities(workspace_id: WorkspaceId) -> anyhow::Result<StorageCapabilities> {
    Ok(workspace_manager().capabilities(&workspace_id).await?)
}

#[command("workspace.file")]
async fn exists(workspace_id: WorkspaceId, path: WorkspaceRelativePath) -> anyhow::Result<bool> {
    Ok(workspace_manager()
        .file_exists(&workspace_id, &path)
        .await?)
}

#[command("workspace.file")]
async fn metadata(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
) -> anyhow::Result<StorageEntryMetadata> {
    Ok(workspace_manager()
        .file_metadata(&workspace_id, &path)
        .await?)
}

#[command("workspace.file")]
async fn list(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
) -> anyhow::Result<Vec<StorageEntry>> {
    Ok(workspace_manager()
        .list_directory(&workspace_id, &path)
        .await?)
}

#[command("workspace.file")]
async fn read_text(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
) -> anyhow::Result<String> {
    Ok(workspace_manager().read_text(&workspace_id, &path).await?)
}

#[command("workspace.file")]
async fn read_bytes(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
) -> anyhow::Result<Vec<u8>> {
    Ok(workspace_manager().read_bytes(&workspace_id, &path).await?)
}

#[command("workspace.file")]
async fn write_text(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
    text: String,
    overwrite: bool,
    create_parent: bool,
) -> anyhow::Result<()> {
    Ok(workspace_manager()
        .write_text(
            &workspace_id,
            &path,
            &text,
            WriteOptions {
                overwrite,
                create_parent,
                atomic: false,
            },
        )
        .await?)
}

#[command("workspace.file")]
async fn write_bytes(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
    data: Vec<u8>,
    overwrite: bool,
    create_parent: bool,
) -> anyhow::Result<()> {
    Ok(workspace_manager()
        .write_bytes(
            &workspace_id,
            &path,
            &data,
            WriteOptions {
                overwrite,
                create_parent,
                atomic: false,
            },
        )
        .await?)
}

#[command("workspace.file")]
async fn create_directory(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
) -> anyhow::Result<()> {
    Ok(workspace_manager()
        .create_directory(&workspace_id, &path)
        .await?)
}

#[command("workspace.file")]
async fn rename(
    workspace_id: WorkspaceId,
    from_path: WorkspaceRelativePath,
    to_path: WorkspaceRelativePath,
) -> anyhow::Result<()> {
    Ok(workspace_manager()
        .rename(&workspace_id, &from_path, &to_path)
        .await?)
}

#[command("workspace.file")]
async fn remove(
    workspace_id: WorkspaceId,
    path: WorkspaceRelativePath,
    recursive: bool,
) -> anyhow::Result<()> {
    Ok(workspace_manager()
        .remove(&workspace_id, &path, recursive)
        .await?)
}

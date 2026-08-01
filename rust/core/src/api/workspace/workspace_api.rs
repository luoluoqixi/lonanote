use cmdreg::command;

use crate::workspace::{
    workspace_manager, RelocateWorkspaceResult, RemoveWorkspaceResult, StorageProviderId,
    WorkspaceId, WorkspaceListItem, WorkspaceLocalSetting, WorkspaceRecord, WorkspaceRelativePath,
    WorkspaceSettings, WorkspaceSnapshot, WorkspaceStorageBinding, WorkspaceStorageTarget,
};

#[command("workspace")]
async fn list() -> Vec<WorkspaceListItem> {
    workspace_manager().list_workspaces().await
}

#[command("workspace")]
async fn get(workspace_id: WorkspaceId) -> anyhow::Result<WorkspaceSnapshot> {
    Ok(workspace_manager().get_workspace(&workspace_id).await?)
}

#[command("workspace")]
async fn is_open(workspace_id: WorkspaceId) -> bool {
    workspace_manager().is_workspace_open(&workspace_id).await
}

#[command("workspace")]
async fn create_managed(
    provider_id: StorageProviderId,
    display_name: String,
) -> anyhow::Result<WorkspaceSnapshot> {
    Ok(workspace_manager()
        .create_managed_workspace(provider_id, display_name)
        .await?)
}

#[command("workspace")]
async fn create_external(
    binding: WorkspaceStorageBinding,
    display_name: String,
) -> anyhow::Result<WorkspaceSnapshot> {
    Ok(workspace_manager()
        .create_external_workspace(binding, display_name)
        .await?)
}

#[command("workspace")]
async fn attach(binding: WorkspaceStorageBinding) -> anyhow::Result<WorkspaceRecord> {
    Ok(workspace_manager().attach_workspace(binding).await?)
}

#[command("workspace")]
async fn open(workspace_id: WorkspaceId) -> anyhow::Result<WorkspaceSnapshot> {
    Ok(workspace_manager().open_workspace(&workspace_id).await?)
}

#[command("workspace")]
async fn close(workspace_id: WorkspaceId) -> anyhow::Result<()> {
    Ok(workspace_manager().close_workspace(&workspace_id).await?)
}

#[command("workspace")]
async fn remove(
    workspace_id: WorkspaceId,
    delete_files: bool,
) -> anyhow::Result<RemoveWorkspaceResult> {
    Ok(workspace_manager()
        .remove_workspace(&workspace_id, delete_files)
        .await?)
}

#[command("workspace")]
async fn relocate(
    workspace_id: WorkspaceId,
    target: WorkspaceStorageTarget,
) -> anyhow::Result<RelocateWorkspaceResult> {
    Ok(workspace_manager()
        .relocate_workspace(&workspace_id, target)
        .await?)
}

#[command("workspace")]
async fn update_display_name(
    workspace_id: WorkspaceId,
    display_name: String,
) -> anyhow::Result<WorkspaceSnapshot> {
    Ok(workspace_manager()
        .update_display_name(&workspace_id, display_name)
        .await?)
}

#[command("workspace")]
async fn get_settings(workspace_id: WorkspaceId) -> anyhow::Result<WorkspaceSettings> {
    Ok(workspace_manager().get_settings(&workspace_id).await?)
}

#[command("workspace")]
async fn set_settings(
    workspace_id: WorkspaceId,
    settings: WorkspaceSettings,
) -> anyhow::Result<WorkspaceSettings> {
    Ok(workspace_manager()
        .set_settings(&workspace_id, settings)
        .await?)
}

#[command("workspace")]
async fn get_last_workspace_id() -> Option<WorkspaceId> {
    workspace_manager().get_last_workspace_id().await
}

#[command("workspace")]
async fn get_local_setting(workspace_id: WorkspaceId) -> anyhow::Result<WorkspaceLocalSetting> {
    Ok(workspace_manager().get_local_setting(&workspace_id).await?)
}

#[command("workspace")]
async fn set_last_open_file(
    workspace_id: WorkspaceId,
    path: Option<WorkspaceRelativePath>,
) -> anyhow::Result<WorkspaceLocalSetting> {
    Ok(workspace_manager()
        .set_last_open_file(&workspace_id, path)
        .await?)
}

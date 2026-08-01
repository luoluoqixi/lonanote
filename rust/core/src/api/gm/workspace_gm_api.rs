use cmdreg::command;

use crate::workspace::{workspace_manager, RemoveWorkspaceResult};

/// 开发阶段的 GM Workspace 重置入口。
#[command("gm.workspace")]
async fn reset_initial_workspace() -> anyhow::Result<Option<RemoveWorkspaceResult>> {
    Ok(workspace_manager().gm_reset_initial_workspace().await?)
}

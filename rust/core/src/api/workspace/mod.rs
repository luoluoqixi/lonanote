use anyhow::Result;

mod workspace_instance_api;
mod workspace_manager_api;

pub fn reg_commands() -> Result<()> {
    workspace_manager_api::reg_commands()?;
    workspace_instance_api::reg_commands()?;
    Ok(())
}

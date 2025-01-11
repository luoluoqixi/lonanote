use anyhow::Result;

mod workspace;
mod workspace_manager;

pub fn reg_commands() -> Result<()> {
    workspace_manager::reg_commands()?;
    workspace::reg_commands()?;
    Ok(())
}

use anyhow::Result;

mod workspace;

pub fn reg_commands() -> Result<()> {
    workspace::reg_commands()?;
    Ok(())
}

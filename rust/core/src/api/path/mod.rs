mod path;

use anyhow::Result;

pub fn reg_commands() -> Result<()> {
    path::reg_commands()?;

    Ok(())
}

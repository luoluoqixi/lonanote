mod settings;

use anyhow::Result;

pub fn reg_commands() -> Result<()> {
    settings::reg_commands()?;

    Ok(())
}

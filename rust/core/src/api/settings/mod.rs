mod settings_api;

use anyhow::Result;

pub fn reg_commands() -> Result<()> {
    settings_api::reg_commands()?;

    Ok(())
}

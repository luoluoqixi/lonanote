mod app_api;

use anyhow::Result;

pub fn reg_commands() -> Result<()> {
    app_api::reg_commands()?;

    Ok(())
}

mod path_api;

use anyhow::Result;

pub fn reg_commands() -> Result<()> {
    path_api::reg_commands()?;

    Ok(())
}

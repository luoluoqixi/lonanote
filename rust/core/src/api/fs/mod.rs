mod fs_api;

use anyhow::Result;

pub fn reg_commands() -> Result<()> {
    fs_api::reg_commands()?;

    Ok(())
}

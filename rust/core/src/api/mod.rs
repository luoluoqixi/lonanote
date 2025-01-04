mod path;
mod settings;
mod test;
mod workspace;

use anyhow::Result;
use log::info;

pub fn reg_commands() -> Result<()> {
    info!("register commands...");

    test::reg_commands()?;
    path::reg_commands()?;
    settings::reg_commands()?;
    workspace::reg_commands()?;

    info!("register commands finish!");

    Ok(())
}

mod test;

use anyhow::Result;
use log::info;

pub fn reg_commands() -> Result<()> {
    info!("register commands...");

    test::reg_commands()?;

    info!("register commands finish!");

    Ok(())
}

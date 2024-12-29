mod hello_commands;

use anyhow::Result;

pub fn reg_commands() -> Result<()> {
    hello_commands::reg_hello_commands()?;

    Ok(())
}

use anyhow::Result;
use lonanote_commands::{
    reg_command,
    result::{CommandResponse, CommandResult},
};

fn get_version() -> CommandResult {
    let version = env!("CARGO_PKG_VERSION");
    CommandResponse::json(version)
}

pub fn reg_commands() -> Result<()> {
    reg_command("app.get_version", get_version)?;

    Ok(())
}

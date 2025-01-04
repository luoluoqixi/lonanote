use anyhow::Result;
use lonanote_commands::{
    reg_command_async,
    result::{CommandResponse, CommandResult},
};

use crate::settings::SETTINGS;

async fn get_settings() -> CommandResult {
    let settings = SETTINGS.read().await;
    let res = CommandResponse::json(settings.clone())?;

    Ok(res)
}

async fn save_settings() -> CommandResult {
    let settings = SETTINGS.read().await;
    settings.save()?;

    Ok(CommandResponse::None)
}

pub fn reg_commands() -> Result<()> {
    reg_command_async("get_settings", get_settings)?;
    reg_command_async("save_settings", save_settings)?;

    Ok(())
}

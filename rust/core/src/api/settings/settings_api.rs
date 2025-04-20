use anyhow::Result;
use lonanote_commands::{
    body::Json,
    reg_command_async,
    result::{CommandResponse, CommandResult},
};

use crate::settings::Settings;

async fn get_settings() -> CommandResult {
    let settings = crate::settings::get_settings().await;
    let res = CommandResponse::json(settings.clone())?;

    Ok(res)
}

async fn set_settings(Json(s): Json<Settings>) -> CommandResult {
    let mut settings = crate::settings::get_settings_mut().await;
    *settings = s;

    Ok(CommandResponse::None)
}

async fn set_settings_and_save(Json(s): Json<Settings>) -> CommandResult {
    let mut settings = crate::settings::get_settings_mut().await;
    *settings = s;
    settings.save()?;

    Ok(CommandResponse::None)
}

async fn save_settings() -> CommandResult {
    let settings = crate::settings::get_settings().await;
    settings.save()?;

    Ok(CommandResponse::None)
}

async fn reset_settings_auto_save_interval() -> CommandResult {
    let mut settings = crate::settings::get_settings_mut().await;
    settings.auto_save_interval = Settings::default_auto_save_interval();
    settings.save()?;

    Ok(CommandResponse::None)
}

pub fn reg_commands() -> Result<()> {
    reg_command_async("settings.get_settings", get_settings)?;
    reg_command_async("settings.set_settings", set_settings)?;
    reg_command_async("settings.set_settings_and_save", set_settings_and_save)?;
    reg_command_async("settings.save_settings", save_settings)?;
    reg_command_async(
        "settings.reset_settings_auto_save_interval",
        reset_settings_auto_save_interval,
    )?;

    Ok(())
}

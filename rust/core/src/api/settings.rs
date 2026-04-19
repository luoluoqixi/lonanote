use cmdreg::{command, CommandResponse, CommandResult, Json};

use crate::settings::Settings;

#[command("settings")]
async fn get_settings() -> CommandResult {
    let settings = crate::settings::get_settings().await;
    let res = CommandResponse::json(settings.clone())?;

    Ok(res)
}

#[command("settings")]
async fn set_settings(Json(s): Json<Settings>) -> CommandResult {
    let mut settings = crate::settings::get_settings_mut().await;
    *settings = s;

    Ok(CommandResponse::None)
}

#[command("settings")]
async fn set_settings_and_save(Json(s): Json<Settings>) -> CommandResult {
    let mut settings = crate::settings::get_settings_mut().await;
    *settings = s;
    settings.save()?;

    Ok(CommandResponse::None)
}

#[command("settings")]
async fn save_settings() -> CommandResult {
    let settings = crate::settings::get_settings().await;
    settings.save()?;

    Ok(CommandResponse::None)
}

#[command("settings")]
async fn reset_settings_auto_save_interval() -> CommandResult {
    let mut settings = crate::settings::get_settings_mut().await;
    settings.auto_save_interval = Settings::default_auto_save_interval();
    settings.save()?;

    Ok(CommandResponse::None)
}

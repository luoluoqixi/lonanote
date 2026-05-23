use anyhow::Result;
use cmdreg::{command, Json};

use crate::settings::Settings;

#[command("settings")]
async fn get_settings() -> Result<Settings> {
    let settings = crate::settings::get_settings().await;
    Ok(settings.clone())
}

#[command("settings")]
async fn set_settings(Json(s): Json<Settings>) -> Result<()> {
    let mut settings = crate::settings::get_settings_mut().await;
    *settings = s;

    Ok(())
}

#[command("settings")]
async fn set_settings_and_save(Json(s): Json<Settings>) -> Result<()> {
    let mut settings = crate::settings::get_settings_mut().await;
    *settings = s;
    settings.save()?;

    Ok(())
}

#[command("settings")]
async fn save_settings() -> Result<()> {
    let settings = crate::settings::get_settings().await;
    settings.save()?;

    Ok(())
}

#[command("settings")]
async fn reset_settings_auto_save_interval() -> Result<()> {
    let mut settings = crate::settings::get_settings_mut().await;
    settings.auto_save_interval = Settings::default_auto_save_interval();
    settings.save()?;

    Ok(())
}

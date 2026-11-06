use anyhow::Result;
use cmdreg::{command, Json};

use crate::{
    config::config_sync::{config_sync_hub, ConfigSnapshot},
    settings::{self, Settings, SettingsPatch},
};

#[command("settings")]
async fn get_settings() -> Result<Settings> {
    let settings = crate::settings::get_settings().await;
    Ok(settings.clone())
}

#[command("settings")]
async fn snapshot() -> Result<ConfigSnapshot<Settings>> {
    let settings = crate::settings::get_settings().await;
    Ok(config_sync_hub().global_settings_snapshot(settings.clone()))
}

#[command("settings")]
async fn patch_and_save(Json(patch): Json<SettingsPatch>) -> Result<ConfigSnapshot<Settings>> {
    settings::patch_settings_and_save(patch).await
}

#[command("settings")]
async fn set_settings(Json(s): Json<Settings>) -> Result<()> {
    settings::replace_settings_and_save(s).await?;
    Ok(())
}

#[command("settings")]
async fn set_settings_and_save(Json(s): Json<Settings>) -> Result<()> {
    settings::replace_settings_and_save(s).await?;
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
    settings::patch_settings_and_save(SettingsPatch {
        auto_save_interval: Some(Settings::default_auto_save_interval()),
        ..SettingsPatch::default()
    })
    .await?;
    Ok(())
}

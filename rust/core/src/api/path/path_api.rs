use anyhow::Result;
use lonanote_commands::{
    body::Json,
    reg_command,
    result::{CommandResponse, CommandResult},
};

use crate::config::app_path;

fn get_cache_dir() -> CommandResult {
    CommandResponse::json(app_path::get_cache_dir())
}

fn get_home_dir() -> CommandResult {
    CommandResponse::json(app_path::get_home_dir())
}

fn get_data_dir() -> CommandResult {
    CommandResponse::json(app_path::get_data_dir())
}

fn get_download_dir() -> CommandResult {
    CommandResponse::json(app_path::get_download_dir())
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct InitDir {
    pub data_dir: String,
    pub cache_dir: String,
    pub download_dir: String,
    pub home_dir: String,
    pub root_dir: Option<String>,
}

fn init_dir(Json(dirs): Json<InitDir>) -> CommandResult {
    app_path::init_dir(
        dirs.data_dir,
        dirs.cache_dir,
        dirs.download_dir,
        dirs.home_dir,
        dirs.root_dir,
    );

    Ok(CommandResponse::None)
}

pub fn reg_commands() -> Result<()> {
    reg_command("path.get_cache_dir", get_cache_dir)?;
    reg_command("path.get_home_dir", get_home_dir)?;
    reg_command("path.get_data_dir", get_data_dir)?;
    reg_command("path.get_download_dir", get_download_dir)?;
    reg_command("path.init_dir", init_dir)?;

    Ok(())
}

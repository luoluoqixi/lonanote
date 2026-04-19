use cmdreg::{command, CommandResponse, CommandResult, Json};

use crate::config::app_path;

#[command("path")]
fn get_cache_dir() -> CommandResult {
    CommandResponse::json(app_path::get_cache_dir())
}

#[command("path")]
fn get_home_dir() -> CommandResult {
    CommandResponse::json(app_path::get_home_dir())
}

#[command("path")]
fn get_data_dir() -> CommandResult {
    CommandResponse::json(app_path::get_data_dir())
}

#[command("path")]
fn get_download_dir() -> CommandResult {
    CommandResponse::json(app_path::get_download_dir())
}

#[command("path")]
fn get_root_dir() -> CommandResult {
    CommandResponse::json(app_path::get_root_dir())
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

#[command("path")]
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

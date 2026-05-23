use cmdreg::command;

use crate::config::app_path;

#[command("path")]
fn get_cache_dir() -> String {
    app_path::get_cache_dir()
}

#[command("path")]
fn get_home_dir() -> String {
    app_path::get_home_dir()
}

#[command("path")]
fn get_data_dir() -> String {
    app_path::get_data_dir()
}

#[command("path")]
fn get_download_dir() -> String {
    app_path::get_download_dir()
}

#[command("path")]
fn init_dir(data_dir: String, cache_dir: String, download_dir: String, home_dir: String) {
    app_path::init_dir(data_dir, cache_dir, download_dir, home_dir);
}

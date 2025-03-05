mod commands;

use anyhow::Result;
use std::sync::OnceLock;
use tauri::{App, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();
pub static MAIN_WINDOW_NAME: &str = "main";

fn init(app: &mut App) -> Result<()> {
    let path = app.handle().path();
    let id = &app.config().identifier;
    let cache_dir = path.temp_dir()?.to_str().unwrap().to_string();
    let cache_dir = format!("{}/{}", cache_dir, id);
    let data_dir = path.app_data_dir()?.to_str().unwrap().to_string();
    let download_dir = path.download_dir()?.to_str().unwrap().to_string();
    let home_dir = path.home_dir()?.to_str().unwrap().to_string();
    lonanote_core::config::app_path::init_dir(data_dir, cache_dir, download_dir, home_dir);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ctx = tauri::generate_context!();
    let builder = tauri::Builder::default();
    let third_log_filter = if cfg!(debug_assertions) {
        log::LevelFilter::Info
    } else {
        log::LevelFilter::Error
    };
    let builder = { commands::reg_commands(builder) };
    let app = builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .max_file_size(50_000 /* bytes */)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("logs".to_string()),
                    },
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Webview,
                ))
                .level(log::LevelFilter::Info)
                .level_for("lonanote", log::LevelFilter::Info)
                .level_for("lonanote_lib", log::LevelFilter::Info)
                .level_for("lonanote-lib", log::LevelFilter::Info)
                .level_for("lonanote-core", log::LevelFilter::Info)
                .level_for("lonanote_core", log::LevelFilter::Info)
                .level_for("tao", third_log_filter)
                .level_for(
                    "tao::platform_impl::platform::event_loop::runner",
                    log::LevelFilter::Error,
                )
                .build(),
        )
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            init(app)?;

            let win_builder =
                WebviewWindowBuilder::new(app, MAIN_WINDOW_NAME, WebviewUrl::default());
            let _ = win_builder.build().unwrap();
            commands::init_commands()?;

            Ok(())
        })
        .build(ctx)
        .expect("error while running tauri application");
    APP_HANDLE.set(app.app_handle().to_owned()).unwrap();
    app.run(|_, _| {});
}

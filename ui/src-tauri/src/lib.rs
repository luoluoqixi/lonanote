mod commands;
mod plugins;
mod utils;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use std::sync::OnceLock;

pub static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ctx = tauri::generate_context!();
    let builder = tauri::Builder::default();
    let third_log_filter = if cfg!(debug_assertions) {
        log::LevelFilter::Info
    } else {
        log::LevelFilter::Error
    };
    #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos",))]
    let builder = { builder.plugin(tauri_plugin_decorum::init()) };
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
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let conf = app.config();
            let title = conf.product_name.as_ref().unwrap().as_str();
            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default());

            #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos",))]
            let win_builder = win_builder
                .visible(true)
                .title(title)
                .inner_size(1024.0, 576.0)
                .transparent(true);

            // #[cfg(any(target_os = "windows"))]
            #[cfg(target_os = "windows")]
            let win_builder = win_builder.decorations(false);

            let win = win_builder.build().unwrap();
            utils::init_titlebar(&win);

            #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos",))]
            {
                // 开发模式下自动打开devtools
                #[cfg(debug_assertions)]
                win.open_devtools();
            }

            plugins::init_plugins(app)?;

            Ok(())
        })
        .build(ctx)
        .expect("error while running tauri application");
    APP_HANDLE.set(app.app_handle().to_owned()).unwrap();
    app.run(|_, _| {});
}

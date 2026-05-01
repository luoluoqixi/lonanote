mod commands;
mod plugins;
mod setup;

use tauri::{AppHandle, Manager};

use std::sync::{LazyLock, OnceLock};

pub static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

pub const APP_NAME: &str = env!("CARGO_PKG_NAME");
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

pub static APP_TITLE: LazyLock<String> =
    LazyLock::new(|| format!("{} - {}", APP_NAME, APP_VERSION));

pub fn run() {
    let ctx = tauri::generate_context!();
    let builder = tauri::Builder::default();
    let builder = { commands::reg_commands(builder) };

    let app = builder
        .plugin(setup::log::init_tauri_log())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            if let Some(win) = app.get_webview_window("main") {
                #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos",))]
                {
                    win.set_title(&APP_TITLE)
                        .unwrap_or_else(|err| log::error!("set_title error: {}", err));

                    // 开发模式下自动打开devtools
                    #[cfg(debug_assertions)]
                    win.open_devtools();
                }
            }
            plugins::init_plugins(app)?;

            Ok(())
        })
        .build(ctx)
        .expect("error while running tauri application");
    APP_HANDLE.set(app.app_handle().to_owned()).unwrap();
    app.run(|_, _| {});
}

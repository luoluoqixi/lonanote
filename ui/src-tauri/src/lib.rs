mod commands;
mod plugins;
mod setup;
mod utils;

use tauri::{AppHandle, Manager};

use std::sync::{LazyLock, OnceLock};

pub static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

pub const APP_NAME: &str = env!("CARGO_PKG_NAME");
pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

pub static MAIN_WINDOW_NAME: &str = "main";

pub static APP_TITLE: LazyLock<String> = LazyLock::new(|| format!("{} {}", APP_NAME, APP_VERSION));

pub fn run() {
    let ctx = tauri::generate_context!();
    let builder = tauri::Builder::default();
    let builder = { commands::reg_commands(builder) };

    let app = builder
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(setup::log::init_tauri_log())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        // .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::{TitleBarStyle, WebviewUrl, WebviewWindowBuilder};

                let win_builder =
                    WebviewWindowBuilder::new(app, MAIN_WINDOW_NAME, WebviewUrl::default())
                        .inner_size(1024.0, 576.0);

                // 保持标准原生标题栏，让系统按默认方式布局原生标题和 traffic lights。
                let win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);

                let _ = win_builder.build().unwrap();
            }

            if let Some(win) = app.get_webview_window(MAIN_WINDOW_NAME) {
                #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos",))]
                {
                    win.set_title(&APP_TITLE)
                        .unwrap_or_else(|err| log::error!("set_title error: {}", err));

                    commands::init_commands()?;

                    utils::win::fix_window_resize(&win);
                    utils::win::set_win_bg_rgba(&win, (245, 245, 245, 255))
                        .unwrap_or_else(|e| log::error!("{}", e));

                    #[cfg(not(target_os = "windows"))]
                    utils::win::add_devtools_listener(&win);

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

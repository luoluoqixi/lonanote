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
    // 必须最先注册：第二个进程在插件 setup 中转发请求并退出，不能初始化 Core。
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        log::info!("收到重复启动请求，使用当前进程新建工作台窗口");
        setup::single_instance::request_new_window(app);
    }));
    let builder = commands::reg_commands(builder);

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
            commands::init_commands(app.handle())?;
            setup::config_events::init_config_event_relay(app.handle());
            setup::app_menu::init(app.handle())?;
            #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos"))]
            setup::window::init_main_window(app)?;

            plugins::init_plugins(app)?;

            Ok(())
        })
        .build(ctx)
        .expect("error while running tauri application");
    APP_HANDLE.set(app.app_handle().to_owned()).unwrap();
    app.run(|app, event| {
        #[cfg(desktop)]
        if matches!(&event, tauri::RunEvent::Ready) {
            setup::single_instance::ready(app);
        }
        if let tauri::RunEvent::ExitRequested { api, code, .. } = &event {
            log::info!("application exit requested: code={code:?}");
            if !setup::window_close::ALLOW_EXIT.load(std::sync::atomic::Ordering::SeqCst) {
                if app.webview_windows().is_empty() {
                    #[cfg(target_os = "macos")]
                    api.prevent_exit();
                } else {
                    api.prevent_exit();
                    let app = app.clone();
                    tauri::async_runtime::spawn(async move {
                        if let Err(error) = setup::window_close::request_close(app, None).await {
                            log::error!("退出应用失败：{error}");
                        }
                    });
                }
            }
        }
        #[cfg(target_os = "macos")]
        if matches!(event, tauri::RunEvent::Reopen { .. }) {
            // Finder / Dock 再次打开通常直接通知已有进程，不启动第二个可执行文件。
            setup::single_instance::request_new_window(app);
        }
    });
}

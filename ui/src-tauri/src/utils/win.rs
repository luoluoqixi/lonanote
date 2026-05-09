use std::str::FromStr;

use tauri::utils::config::Color;
use tauri::{Manager, WebviewWindow};

pub fn get_app_handle() -> Option<&'static tauri::AppHandle> {
    let app = &crate::APP_HANDLE;
    app.get()
}

pub fn get_window(label: &str) -> Option<tauri::WebviewWindow> {
    if let Some(app) = get_app_handle() {
        app.get_webview_window(label)
    } else {
        None
    }
}

pub fn get_main_window() -> Option<tauri::WebviewWindow> {
    get_window(crate::MAIN_WINDOW_NAME)
}

pub fn fix_window_resize(win: &WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        // 修复 Windows 上窗口调整大小时 webview 调整慢的问题
        // https://github.com/tauri-apps/tauri/issues/6322#issuecomment-1448141495
        win.on_window_event(|e| {
            use tauri::WindowEvent;

            if let WindowEvent::Resized(_) = e {
                std::thread::sleep(std::time::Duration::from_millis(1));
            }
        });
    }
}

pub fn set_win_bg_rgba(win: &WebviewWindow, color: (u8, u8, u8, u8)) -> anyhow::Result<()> {
    win.set_background_color(Some(Color::from(color)))
        .map_err(|e| anyhow::anyhow!("set_background_color error: {}", e))?;
    Ok(())
}

pub fn set_win_bg_hex(win: &WebviewWindow, color: &str) -> anyhow::Result<()> {
    win.set_background_color(Some(
        Color::from_str(color).map_err(|err| anyhow::anyhow!("parse color error: {}", err))?,
    ))
    .map_err(|e| anyhow::anyhow!("set_background_color error: {}", e))?;
    Ok(())
}

// 添加了 features devtools 后，tauri 内置了 devtools 的快捷键
#[allow(dead_code)]
pub fn add_devtools_listener(win: &WebviewWindow) {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

    let label = win.label().to_string();
    win.global_shortcut()
        .on_shortcut("CommandOrControl+Shift+I", move |_, _, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }
            if let Some(win) = get_window(&label) {
                #[cfg(target_os = "windows")]
                {
                    // Windows 上没有 close_devtools 接口, 无法关闭
                    win.open_devtools();
                }
                #[cfg(not(target_os = "windows"))]
                {
                    if win.is_devtools_open() {
                        win.close_devtools();
                    } else {
                        win.open_devtools();
                    }
                }
            }
        })
        .unwrap_or_else(|err| log::error!("add_devtools_listener error: {}", err));
}

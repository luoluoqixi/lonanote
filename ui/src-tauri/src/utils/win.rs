use serde::Deserialize;
use std::str::FromStr;
use tauri::utils::config::Color;
use tauri::{Manager, PhysicalPosition, PhysicalSize, Position, Size, Theme, WebviewWindow};

const UI_THEME_MODE_KEY: &str = "ui.appearance.themeMode";
const UI_RESTORE_WINDOW_STATE_KEY: &str = "ui.window.restoreWindowState";
const UI_WINDOW_LAST_STATE_KEY: &str = "ui.window.lastState";
const LIGHT_WINDOW_BACKGROUND_RGBA: (u8, u8, u8, u8) = (245, 245, 245, 255);
const DARK_WINDOW_BACKGROUND_RGBA: (u8, u8, u8, u8) = (24, 24, 27, 255);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredWindowState {
    height: u32,
    is_fullscreen: bool,
    is_maximized: bool,
    width: u32,
    x: i32,
    y: i32,
}

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

pub fn init_window(win: &WebviewWindow) -> anyhow::Result<()> {
    restore_initial_window_state(win)?;
    set_initial_window_background(win)
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
    #[cfg(not(target_os = "windows"))]
    {
        let _ = win;
    }
}

pub fn set_initial_window_background(win: &WebviewWindow) -> anyhow::Result<()> {
    set_win_bg_rgba(win, resolve_initial_window_background(win))
}

fn restore_initial_window_state(win: &WebviewWindow) -> anyhow::Result<()> {
    if !should_restore_window_state() {
        return Ok(());
    }

    let Some(window_state) = read_preferred_window_state() else {
        return Ok(());
    };

    if window_state.width == 0 || window_state.height == 0 {
        log::warn!(
            "ignore invalid startup window size: {}x{}",
            window_state.width,
            window_state.height
        );
        return Ok(());
    }

    if !window_state.is_maximized && !window_state.is_fullscreen {
        win.set_size(Size::Physical(PhysicalSize::new(
            window_state.width,
            window_state.height,
        )))
        .map_err(|e| anyhow::anyhow!("set startup window size error: {}", e))?;
        win.set_position(Position::Physical(PhysicalPosition::new(
            window_state.x,
            window_state.y,
        )))
        .map_err(|e| anyhow::anyhow!("set startup window position error: {}", e))?;
    }

    if window_state.is_maximized {
        win.maximize()
            .map_err(|e| anyhow::anyhow!("maximize startup window error: {}", e))?;
    }

    if window_state.is_fullscreen {
        win.set_fullscreen(true)
            .map_err(|e| anyhow::anyhow!("set startup window fullscreen error: {}", e))?;
    }

    Ok(())
}

fn resolve_initial_window_background(win: &WebviewWindow) -> (u8, u8, u8, u8) {
    match read_preferred_theme_mode().as_deref() {
        Some("dark") => DARK_WINDOW_BACKGROUND_RGBA,
        Some("light") => LIGHT_WINDOW_BACKGROUND_RGBA,
        _ => resolve_system_window_background(win),
    }
}

fn resolve_system_window_background(win: &WebviewWindow) -> (u8, u8, u8, u8) {
    match win.theme() {
        Ok(Theme::Dark) => DARK_WINDOW_BACKGROUND_RGBA,
        Ok(Theme::Light) => LIGHT_WINDOW_BACKGROUND_RGBA,
        Ok(_) => LIGHT_WINDOW_BACKGROUND_RGBA,
        Err(err) => {
            log::warn!("read window theme error: {}", err);
            LIGHT_WINDOW_BACKGROUND_RGBA
        }
    }
}

fn should_restore_window_state() -> bool {
    match lonanote_core::api::store::common_get(UI_RESTORE_WINDOW_STATE_KEY.to_string()) {
        Ok(Some(serde_json::Value::Bool(enabled))) => enabled,
        Ok(Some(value)) => {
            log::warn!("ignore non-boolean restoreWindowState: {}", value);
            true
        }
        Ok(None) => true,
        Err(err) => {
            log::debug!("read restoreWindowState from store api error: {}", err);
            true
        }
    }
}

fn read_preferred_window_state() -> Option<StoredWindowState> {
    match lonanote_core::api::store::common_get(UI_WINDOW_LAST_STATE_KEY.to_string()) {
        Ok(Some(value)) => match serde_json::from_value::<StoredWindowState>(value) {
            Ok(window_state) => Some(window_state),
            Err(err) => {
                log::warn!("parse startup window state error: {}", err);
                None
            }
        },
        Ok(None) => None,
        Err(err) => {
            log::debug!("read startup window state from store api error: {}", err);
            None
        }
    }
}

fn read_preferred_theme_mode() -> Option<String> {
    match lonanote_core::api::store::common_get(UI_THEME_MODE_KEY.to_string()) {
        Ok(Some(serde_json::Value::String(value))) => match value.as_str() {
            "dark" => Some(value),
            "light" => Some(value),
            "system" => None,
            _ => {
                log::warn!("ignore invalid startup theme mode: {}", value);
                None
            }
        },
        Ok(Some(value)) => {
            log::warn!("ignore non-string startup theme mode: {}", value);
            None
        }
        Ok(None) => None,
        Err(err) => {
            log::debug!("read startup theme mode from store api error: {}", err);
            None
        }
    }
}

pub fn set_win_bg_rgba(win: &WebviewWindow, color: (u8, u8, u8, u8)) -> anyhow::Result<()> {
    #[cfg(not(target_os = "macos"))]
    {
        win.set_background_color(Some(Color::from(color)))
            .map_err(|e| anyhow::anyhow!("set_background_color error: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        set_mac_bg_color(win, color)?;
    }
    Ok(())
}

pub fn set_win_bg_hex(win: &WebviewWindow, color: &str) -> anyhow::Result<()> {
    #[cfg(not(target_os = "macos"))]
    {
        win.set_background_color(Some(
            Color::from_str(color).map_err(|err| anyhow::anyhow!("parse color error: {}", err))?,
        ))
        .map_err(|e| anyhow::anyhow!("set_background_color error: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        let color =
            Color::from_str(color).map_err(|err| anyhow::anyhow!("parse color error: {}", err))?;
        set_mac_bg_color(win, (color.0, color.1, color.2, color.3))?;
    }
    Ok(())
}

// 添加了 features devtools 后，tauri 内置了 devtools 的快捷键, 但是似乎只内置了 windows 的
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

#[cfg(target_os = "macos")]
fn set_mac_bg_color(win: &WebviewWindow, color: (u8, u8, u8, u8)) -> anyhow::Result<()> {
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{NSColor, NSWindow};

    let ns_window_ptr = win.ns_window().unwrap() as *mut AnyObject;
    let ns_window = unsafe { ns_window_ptr.as_ref() }
        .and_then(|obj| obj.downcast_ref::<NSWindow>())
        .expect("failed to get macOS NSWindow");
    let bg_color = NSColor::colorWithSRGBRed_green_blue_alpha(
        color.0 as f64 / 255.0,
        color.1 as f64 / 255.0,
        color.2 as f64 / 255.0,
        color.3 as f64 / 255.0,
    );
    ns_window.setBackgroundColor(Some(&bg_color));

    Ok(())
}

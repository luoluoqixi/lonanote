use serde::Deserialize;
use std::str::FromStr;
use tauri::utils::config::Color;
use tauri::{Manager, Theme, WebviewWindow};

const UI_THEME_MODE_KEY: &str = "ui.appearance.themeMode";
const UI_RESTORE_WINDOW_STATE_KEY: &str = "ui.window.restoreWindowState";
const UI_WINDOW_LAST_STATE_KEY: &str = "ui.window.lastState";
const LIGHT_WINDOW_BACKGROUND_RGBA: (u8, u8, u8, u8) = (245, 245, 245, 255);
const DARK_WINDOW_BACKGROUND_RGBA: (u8, u8, u8, u8) = (24, 24, 27, 255);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartupWindowState {
    pub height: u32,
    pub is_fullscreen: bool,
    pub is_maximized: bool,
    pub width: u32,
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Default)]
pub struct StartupWindowPreferences {
    pub background_color: Option<Color>,
    pub window_state: Option<StartupWindowState>,
}

impl StartupWindowPreferences {
    pub fn should_apply_runtime_background(&self) -> bool {
        self.background_color.is_none()
    }
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

pub fn resolve_startup_window_preferences() -> StartupWindowPreferences {
    StartupWindowPreferences {
        background_color: resolve_startup_window_background_color(),
        window_state: resolve_startup_window_state(),
    }
}

pub fn apply_preferred_window_background(win: &WebviewWindow) -> anyhow::Result<()> {
    set_win_bg_rgba(win, resolve_preferred_window_background(win))
}

fn resolve_startup_window_state() -> Option<StartupWindowState> {
    if !should_restore_window_state() {
        return None;
    }

    let window_state = read_preferred_window_state()?;

    if window_state.width == 0 || window_state.height == 0 {
        log::warn!(
            "ignore invalid startup window size: {}x{}",
            window_state.width,
            window_state.height
        );
        return None;
    }

    Some(window_state)
}

fn resolve_startup_window_background_color() -> Option<Color> {
    match read_preferred_theme_mode().as_deref() {
        Some("dark") => Some(Color::from(DARK_WINDOW_BACKGROUND_RGBA)),
        Some("light") => Some(Color::from(LIGHT_WINDOW_BACKGROUND_RGBA)),
        _ => None,
    }
}

fn resolve_preferred_window_background(win: &WebviewWindow) -> (u8, u8, u8, u8) {
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

fn read_preferred_window_state() -> Option<StartupWindowState> {
    match lonanote_core::api::store::common_get(UI_WINDOW_LAST_STATE_KEY.to_string()) {
        Ok(Some(value)) => match serde_json::from_value::<StartupWindowState>(value) {
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

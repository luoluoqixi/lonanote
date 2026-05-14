use anyhow::{Context, Result};
use tauri::utils::config::WindowConfig;
use tauri::{App, Manager, WebviewWindow, WebviewWindowBuilder};
#[cfg(not(target_os = "windows"))]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::commands;
use crate::utils;

pub fn init_main_window(app: &App) -> Result<WebviewWindow> {
    let app_handle = app.handle().clone();
    commands::init_commands(&app_handle)?;

    let window = create_main_window(app)?;
    init_window(&window)?;

    Ok(window)
}

fn create_main_window(app: &App) -> Result<WebviewWindow> {
    if let Some(window) = app.get_webview_window(crate::MAIN_WINDOW_NAME) {
        return Ok(window);
    }

    log::info!(
        "create main window for {} {}",
        crate::APP_NAME,
        crate::APP_VERSION
    );

    let window_config = get_window_config(app, crate::MAIN_WINDOW_NAME)?.clone();

    #[cfg(target_os = "macos")]
    {
        create_macos_main_window(app, &window_config)
    }

    #[cfg(target_os = "windows")]
    {
        create_windows_main_window(app, &window_config)
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        create_unix_main_window(app, &window_config)
    }
}

fn get_window_config<'a>(app: &'a App, label: &str) -> Result<&'a WindowConfig> {
    app.config()
        .app
        .windows
        .iter()
        .find(|config| config.label == label)
        .with_context(|| format!("window config not found for label: {label}"))
}

#[cfg(target_os = "macos")]
fn create_macos_main_window(app: &App, window_config: &WindowConfig) -> Result<WebviewWindow> {
    WebviewWindowBuilder::from_config(app, window_config)
        .context("create macOS main window builder error")?
        .title(crate::APP_TITLE.as_str())
        .visible(false)
        .build()
        .context("build macOS main window error")
}

#[cfg(target_os = "windows")]
fn create_windows_main_window(app: &App, window_config: &WindowConfig) -> Result<WebviewWindow> {
    WebviewWindowBuilder::from_config(app, window_config)
        .context("create Windows main window builder error")?
        .title(crate::APP_TITLE.as_str())
        .visible(false)
        .build()
        .context("build Windows main window error")
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn create_unix_main_window(app: &App, window_config: &WindowConfig) -> Result<WebviewWindow> {
    WebviewWindowBuilder::from_config(app, window_config)
        .context("create desktop main window builder error")?
        .title(crate::APP_TITLE.as_str())
        .visible(false)
        .build()
        .context("build desktop main window error")
}

fn init_window(window: &WebviewWindow) -> Result<()> {
    register_window_resize_fix(window);
    register_window_theme_listener(window);
    utils::win::restore_preferred_window_state(window)?;
    utils::win::apply_preferred_window_background(window)?;

    #[cfg(not(target_os = "windows"))]
    register_devtools_listener(window);

    #[cfg(debug_assertions)]
    window.open_devtools();

    window.show().context("show main window error")?;

    Ok(())
}

fn register_window_resize_fix(window: &WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        window.on_window_event(|event| {
            if let tauri::WindowEvent::Resized(_) = event {
                std::thread::sleep(std::time::Duration::from_millis(1));
            }
        });
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = window;
    }
}

fn register_window_theme_listener(window: &WebviewWindow) {
    let theme_window = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::ThemeChanged(_) = event {
            if let Err(err) = utils::win::apply_preferred_window_background(&theme_window) {
                log::error!("sync window background on theme change error: {}", err);
            }
        }
    });
}

#[cfg(not(target_os = "windows"))]
fn register_devtools_listener(window: &WebviewWindow) {
    let label = window.label().to_string();
    window
        .global_shortcut()
        .on_shortcut("CommandOrControl+Shift+I", move |_, _, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            if let Some(window) = utils::win::get_window(&label) {
                if window.is_devtools_open() {
                    window.close_devtools();
                } else {
                    window.open_devtools();
                }
            }
        })
        .unwrap_or_else(|err| log::error!("register_devtools_listener error: {}", err));
}

use anyhow::{Context, Result};
use tauri::utils::config::WindowConfig;
use tauri::{App, Manager, Runtime, WebviewWindow, WebviewWindowBuilder};
#[cfg(not(target_os = "windows"))]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::commands;
use crate::utils;

#[derive(Debug, Clone)]
struct BuilderStartupWindowState {
    height: f64,
    is_fullscreen: bool,
    is_maximized: bool,
    width: f64,
    x: f64,
    y: f64,
}

pub fn init_main_window(app: &App) -> Result<WebviewWindow> {
    let app_handle = app.handle().clone();
    commands::init_commands(&app_handle)?;

    let startup_preferences = utils::win::resolve_startup_window_preferences();
    let window = create_main_window(app, &startup_preferences)?;
    init_window(&window, &startup_preferences)?;

    Ok(window)
}

fn create_main_window(
    app: &App,
    startup_preferences: &utils::win::StartupWindowPreferences,
) -> Result<WebviewWindow> {
    if let Some(window) = app.get_webview_window(crate::MAIN_WINDOW_NAME) {
        return Ok(window);
    }

    log::info!(
        "create main window for {} {}",
        crate::APP_NAME,
        crate::APP_VERSION
    );

    let window_config = get_window_config(app, crate::MAIN_WINDOW_NAME)?.clone();
    let builder_window_state = resolve_builder_window_state(app, startup_preferences);

    #[cfg(target_os = "macos")]
    {
        create_macos_main_window(
            app,
            &window_config,
            startup_preferences,
            builder_window_state.as_ref(),
        )
    }

    #[cfg(target_os = "windows")]
    {
        create_windows_main_window(
            app,
            &window_config,
            startup_preferences,
            builder_window_state.as_ref(),
        )
    }

    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        create_unix_main_window(
            app,
            &window_config,
            startup_preferences,
            builder_window_state.as_ref(),
        )
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
fn create_macos_main_window(
    app: &App,
    window_config: &WindowConfig,
    startup_preferences: &utils::win::StartupWindowPreferences,
    builder_window_state: Option<&BuilderStartupWindowState>,
) -> Result<WebviewWindow> {
    apply_startup_window_preferences(
        WebviewWindowBuilder::from_config(app, window_config)
            .context("create macOS main window builder error")?
            .title(crate::APP_TITLE.as_str())
            .visible(false),
        startup_preferences,
        builder_window_state,
    )
    .build()
    .context("build macOS main window error")
}

#[cfg(target_os = "windows")]
fn create_windows_main_window(
    app: &App,
    window_config: &WindowConfig,
    startup_preferences: &utils::win::StartupWindowPreferences,
    builder_window_state: Option<&BuilderStartupWindowState>,
) -> Result<WebviewWindow> {
    apply_startup_window_preferences(
        WebviewWindowBuilder::from_config(app, window_config)
            .context("create Windows main window builder error")?
            .title(crate::APP_TITLE.as_str())
            .visible(false),
        startup_preferences,
        builder_window_state,
    )
    .build()
    .context("build Windows main window error")
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn create_unix_main_window(
    app: &App,
    window_config: &WindowConfig,
    startup_preferences: &utils::win::StartupWindowPreferences,
    builder_window_state: Option<&BuilderStartupWindowState>,
) -> Result<WebviewWindow> {
    apply_startup_window_preferences(
        WebviewWindowBuilder::from_config(app, window_config)
            .context("create desktop main window builder error")?
            .title(crate::APP_TITLE.as_str())
            .visible(false),
        startup_preferences,
        builder_window_state,
    )
    .build()
    .context("build desktop main window error")
}

fn resolve_builder_window_state(
    app: &App,
    startup_preferences: &utils::win::StartupWindowPreferences,
) -> Option<BuilderStartupWindowState> {
    let window_state = startup_preferences.window_state.as_ref()?;
    let scale_factor = resolve_startup_window_scale_factor(app, window_state.x, window_state.y);

    Some(BuilderStartupWindowState {
        height: window_state.height as f64 / scale_factor,
        is_fullscreen: window_state.is_fullscreen,
        is_maximized: window_state.is_maximized,
        width: window_state.width as f64 / scale_factor,
        x: window_state.x as f64 / scale_factor,
        y: window_state.y as f64 / scale_factor,
    })
}

fn resolve_startup_window_scale_factor(app: &App, x: i32, y: i32) -> f64 {
    let monitor = app
        .monitor_from_point(x as f64, y as f64)
        .ok()
        .flatten()
        .or_else(|| app.primary_monitor().ok().flatten());

    match monitor {
        Some(monitor) if monitor.scale_factor() > 0.0 => monitor.scale_factor(),
        _ => 1.0,
    }
}

fn apply_startup_window_preferences<'a, R: Runtime, M: Manager<R>>(
    builder: WebviewWindowBuilder<'a, R, M>,
    startup_preferences: &utils::win::StartupWindowPreferences,
    builder_window_state: Option<&BuilderStartupWindowState>,
) -> WebviewWindowBuilder<'a, R, M> {
    let builder = if let Some(background_color) = startup_preferences.background_color {
        builder.background_color(background_color)
    } else {
        builder
    };

    let Some(window_state) = builder_window_state else {
        return builder;
    };

    let builder = if !window_state.is_maximized && !window_state.is_fullscreen {
        builder
            .inner_size(window_state.width, window_state.height)
            .position(window_state.x, window_state.y)
    } else {
        builder
    };

    let builder = if window_state.is_maximized {
        builder.maximized(true)
    } else {
        builder
    };

    if window_state.is_fullscreen {
        builder.fullscreen(true)
    } else {
        builder
    }
}

fn init_window(
    window: &WebviewWindow,
    startup_preferences: &utils::win::StartupWindowPreferences,
) -> Result<()> {
    register_window_resize_fix(window);
    register_window_theme_listener(window);

    if startup_preferences.should_apply_runtime_background() {
        utils::win::apply_preferred_window_background(window)?;
    }

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

use anyhow::{Context, Result};
#[cfg(not(target_os = "windows"))]
use tauri::Manager;
use tauri::{App, WebviewWindow, WebviewWindowBuilder};
#[cfg(not(target_os = "windows"))]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::utils;

pub fn init_main_window(app: &App) -> Result<WebviewWindow> {
    let handle = app.handle();
    migrate_window_preferences(handle)?;
    create_workspace_window(handle, crate::MAIN_WINDOW_NAME, None)
}

pub fn create_workspace_window(
    app: &tauri::AppHandle,
    label: &str,
    monitor: Option<tauri::Monitor>,
) -> Result<WebviewWindow> {
    let _gate = super::window_close::WINDOW_LIFECYCLE_GATE
        .lock()
        .unwrap_or_else(|error| error.into_inner());
    anyhow::ensure!(
        !super::window_close::CLOSE_ACTIVE.load(std::sync::atomic::Ordering::SeqCst),
        "正在确认窗口关闭，请稍后重试"
    );
    let mut config = app
        .config()
        .app
        .windows
        .iter()
        .find(|config| config.label == crate::MAIN_WINDOW_NAME)
        .context("找不到工作台窗口模板")?
        .clone();
    config.label = label.to_string();
    // Windows/macOS 保留 HTML 标签拖放；Linux 的原生监听仅处理文件 URI。
    config.drag_drop_enabled = cfg!(target_os = "linux");
    config.maximized = false;
    config.fullscreen = false;
    let preferences = utils::win::resolve_startup_window_preferences();
    let mut builder = WebviewWindowBuilder::from_config(app, &config)?
        .title(crate::APP_TITLE.as_str())
        .visible(false)
        .initialization_script_for_all_frames(super::external_file_drop::SCRIPT)
        .initialization_script_for_all_frames(
            "window.addEventListener('contextmenu', (event) => event.preventDefault());",
        );
    if let Some(background) = preferences.background_color {
        builder = builder.background_color(background);
    }
    let monitor = monitor.or_else(|| app.primary_monitor().ok().flatten());
    let mut physical_position = None;
    if let Some(monitor) = monitor {
        let area = monitor.work_area();
        let geometry = super::window_geometry::resolve_geometry(
            preferences.window_size,
            super::window_geometry::WorkArea {
                x: area.position.x as f64,
                y: area.position.y as f64,
                width: area.size.width as f64,
                height: area.size.height as f64,
                scale: monitor.scale_factor(),
            },
        );
        builder = builder
            .inner_size(geometry.width, geometry.height)
            .position(geometry.x, geometry.y);
        physical_position = Some(tauri::PhysicalPosition::new(
            geometry.x * monitor.scale_factor(),
            geometry.y * monitor.scale_factor(),
        ));
    } else {
        let size = preferences
            .window_size
            .unwrap_or(super::window_geometry::WindowSize {
                width: 1024.0,
                height: 576.0,
            });
        builder = builder.inner_size(size.width, size.height).center();
    }
    let sessions = &super::window_runtime::WINDOW_SESSIONS;
    sessions.register_window_with_cause(
        label,
        if label == crate::MAIN_WINDOW_NAME {
            super::window_sessions::WindowStartCause::InitialLaunch
        } else {
            super::window_sessions::WindowStartCause::NewWindow
        },
    );
    super::window_runtime::EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .register_owner(label);
    let window = match builder.build() {
        Ok(window) => window,
        Err(error) => {
            sessions.release_window(label);
            return Err(error).context("创建工作台窗口失败");
        }
    };
    super::external_file_drop::install(&window)?;
    // 显示器原点使用全局物理坐标，避免混合 DPI 下 builder 的逻辑坐标换算偏移。
    if let Some(position) = physical_position {
        if let Err(error) = window.set_position(position) {
            let _ = window.destroy();
            sessions.release_window(label);
            return Err(error).context("窗口居中失败");
        }
    }
    let cleanup_label = label.to_string();
    let close_app = app.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Focused(true)) {
            super::app_menu::activate(&close_app, &cleanup_label);
        }
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            log::info!("native window close requested: window={cleanup_label}");
            api.prevent_close();
            let app = close_app.clone();
            let label = cleanup_label.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = super::window_close::request_close(app, Some(label)).await {
                    log::error!("关闭窗口失败：{error}");
                }
            });
        }
        if matches!(event, tauri::WindowEvent::Destroyed) {
            super::window_close::cleanup_window(&cleanup_label);
            super::app_menu::release(&close_app, &cleanup_label);
            crate::commands::window_workspace_api::cleanup_window(
                close_app.clone(),
                cleanup_label.clone(),
            );
        }
    });
    if let Err(error) = init_window(&window, &preferences) {
        let _ = window.destroy();
        return Err(error);
    }
    Ok(window)
}

fn migrate_window_preferences(app: &tauri::AppHandle) -> Result<()> {
    let values = lonanote_core::api::store::common_all()?;
    let old = values.get("ui.window.lastState");
    let monitor = old
        .and_then(|value| Some((value.get("x")?.as_f64()?, value.get("y")?.as_f64()?)))
        .and_then(|(x, y)| app.monitor_from_point(x, y).ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());
    let scale = monitor.map(|monitor| monitor.scale_factor()).unwrap_or(1.0);
    let (set, remove) = super::window_geometry::geometry_migration(&values, scale);
    if !set.is_empty() || !remove.is_empty() {
        lonanote_core::api::store::common_patch_and_save(set, remove)?;
    }
    Ok(())
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
    if window.label() == crate::MAIN_WINDOW_NAME {
        register_devtools_listener(window);
    }

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
    let app = window.app_handle().clone();
    window
        .global_shortcut()
        .on_shortcut("CommandOrControl+Shift+I", move |_, _, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            if let Some(window) = app
                .webview_windows()
                .into_values()
                .find(|window| window.is_focused().unwrap_or(false))
            {
                if window.is_devtools_open() {
                    window.close_devtools();
                } else {
                    window.open_devtools();
                }
            }
        })
        .unwrap_or_else(|err| log::error!("register_devtools_listener error: {}", err));
}

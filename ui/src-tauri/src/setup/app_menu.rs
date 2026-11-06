use std::{
    collections::HashMap,
    sync::{LazyLock, Mutex},
};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Manager, WebviewWindow,
};

#[derive(Clone, serde::Deserialize)]
pub struct MenuGroup {
    title: String,
    items: Vec<MenuNode>,
}
#[derive(Clone, serde::Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum MenuNode {
    Separator,
    Submenu {
        title: String,
        items: Vec<MenuNode>,
    },
    Item {
        title: String,
        action: String,
        enabled: bool,
        shortcut: Option<String>,
    },
}

static WINDOW_MENUS: LazyLock<Mutex<HashMap<String, Menu<tauri::Wry>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
static FALLBACK_MENU: std::sync::OnceLock<Menu<tauri::Wry>> = std::sync::OnceLock::new();

pub fn init(app: &AppHandle) -> tauri::Result<()> {
    if !cfg!(target_os = "macos") {
        return Ok(());
    }
    let fallback = build_menu(app, &[])?;
    app.set_menu(fallback.clone())?;
    let _ = FALLBACK_MENU.set(fallback);
    app.on_menu_event(|app, event| {
        let Some(action) = event.id().as_ref().strip_prefix("lonanote:") else {
            return;
        };
        match action {
            "newWindow" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    if super::window_close::CLOSE_ACTIVE.load(std::sync::atomic::Ordering::SeqCst) {
                        return;
                    }
                    let monitor = focused_window(&app)
                        .and_then(|window| window.current_monitor().ok().flatten());
                    let label = format!("workspace-window-{}", uuid::Uuid::new_v4());
                    if let Err(error) =
                        super::window::create_workspace_window(&app, &label, monitor)
                    {
                        log::error!("原生菜单新建窗口失败：{error}");
                    }
                });
            }
            "quit" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(error) = super::window_close::request_close(app, None).await {
                        log::error!("退出应用失败：{error}");
                    }
                });
            }
            action => {
                if let Some(window) = focused_window(app) {
                    let _ = window.emit_to(
                        tauri::EventTarget::webview_window(window.label()),
                        "lonanote://menu-action",
                        action,
                    );
                }
            }
        }
    });
    Ok(())
}

fn focused_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.webview_windows()
        .into_values()
        .find(|window| window.is_focused().unwrap_or(false))
}

#[tauri::command]
pub fn update_window_menu(window: WebviewWindow, groups: Vec<MenuGroup>) -> Result<(), String> {
    if !cfg!(target_os = "macos") {
        return Ok(());
    }
    let menu = build_menu(window.app_handle(), &groups).map_err(|error| error.to_string())?;
    WINDOW_MENUS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .insert(window.label().to_string(), menu.clone());
    if window.is_focused().unwrap_or(false) {
        window
            .app_handle()
            .set_menu(menu)
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub fn activate(app: &AppHandle, label: &str) {
    if !cfg!(target_os = "macos") {
        return;
    }
    let menu = WINDOW_MENUS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .get(label)
        .cloned()
        .or_else(|| FALLBACK_MENU.get().cloned());
    if let Some(menu) = menu {
        let _ = app.set_menu(menu);
    }
}

pub fn release(app: &AppHandle, label: &str) {
    WINDOW_MENUS
        .lock()
        .unwrap_or_else(|error| error.into_inner())
        .remove(label);
    if let Some(window) = focused_window(app) {
        activate(app, window.label());
    } else if let Some(menu) = FALLBACK_MENU.get() {
        let _ = app.set_menu(menu.clone());
    }
}

fn action_item(
    app: &AppHandle,
    title: &str,
    action: &str,
    enabled: bool,
    shortcut: Option<&str>,
) -> tauri::Result<MenuItem<tauri::Wry>> {
    MenuItem::with_id(app, format!("lonanote:{action}"), title, enabled, shortcut)
}

fn append_nodes(
    app: &AppHandle,
    parent: &Submenu<tauri::Wry>,
    nodes: &[MenuNode],
) -> tauri::Result<()> {
    for node in nodes {
        match node {
            MenuNode::Separator => parent.append(&PredefinedMenuItem::separator(app)?)?,
            MenuNode::Submenu { title, items } => {
                let submenu = Submenu::new(app, title, true)?;
                append_nodes(app, &submenu, items)?;
                parent.append(&submenu)?;
            }
            MenuNode::Item {
                title,
                action,
                enabled,
                shortcut,
            } => {
                let predefined = match action.as_str() {
                    "undo" => Some(PredefinedMenuItem::undo(app, Some(title))?),
                    "redo" => Some(PredefinedMenuItem::redo(app, Some(title))?),
                    "cut" => Some(PredefinedMenuItem::cut(app, Some(title))?),
                    "copy" => Some(PredefinedMenuItem::copy(app, Some(title))?),
                    "paste" => Some(PredefinedMenuItem::paste(app, Some(title))?),
                    "selectAll" => Some(PredefinedMenuItem::select_all(app, Some(title))?),
                    _ => None,
                };
                if let Some(item) = predefined {
                    parent.append(&item)?;
                } else {
                    let accelerator = match action.as_str() {
                        "zoomIn" => Some("Cmd+Plus"),
                        "zoomOut" => Some("Cmd+Minus"),
                        _ => shortcut.as_deref(),
                    };
                    parent.append(&action_item(app, title, action, *enabled, accelerator)?)?;
                }
            }
        }
    }
    Ok(())
}

fn build_menu(app: &AppHandle, groups: &[MenuGroup]) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::new(app)?;
    let application = Submenu::new(app, "LonaNote", true)?;
    application.append(&action_item(app, "关于 LonaNote", "about", true, None)?)?;
    application.append(&action_item(app, "设置…", "settings", true, Some("Cmd+,"))?)?;
    application.append(&PredefinedMenuItem::separator(app)?)?;
    application.append(&PredefinedMenuItem::services(app, None)?)?;
    application.append(&PredefinedMenuItem::hide(app, None)?)?;
    application.append(&PredefinedMenuItem::hide_others(app, None)?)?;
    application.append(&PredefinedMenuItem::show_all(app, None)?)?;
    application.append(&PredefinedMenuItem::separator(app)?)?;
    application.append(&action_item(
        app,
        "退出 LonaNote",
        "quit",
        true,
        Some("Cmd+Q"),
    )?)?;
    menu.append(&application)?;
    if groups.is_empty() {
        let file = Submenu::new(app, "文件", true)?;
        file.append(&action_item(
            app,
            "新建窗口",
            "newWindow",
            true,
            Some("Cmd+Shift+N"),
        )?)?;
        menu.append(&file)?;
    } else {
        for group in groups {
            let submenu = Submenu::new(app, &group.title, true)?;
            append_nodes(app, &submenu, &group.items)?;
            menu.append(&submenu)?;
        }
    }
    let windows = Submenu::new(app, "窗口", true)?;
    windows.append(&PredefinedMenuItem::minimize(app, None)?)?;
    windows.append(&PredefinedMenuItem::fullscreen(app, None)?)?;
    windows.append(&PredefinedMenuItem::bring_all_to_front(app, None)?)?;
    menu.append(&windows)?;
    Ok(menu)
}

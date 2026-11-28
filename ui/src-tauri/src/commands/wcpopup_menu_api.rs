use serde::Deserialize;
use tauri::WebviewWindow;
use wcpopup::{
    config::{Config, Theme},
    MenuBuilder,
};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WcPopupMenuItem {
    id: Option<String>,
    text: Option<String>,
    disabled: Option<bool>,
    checked: Option<bool>,
    separator: Option<bool>,
    sub_menu: Option<Vec<WcPopupMenuItem>>,
}

#[derive(Clone, Deserialize)]
pub(crate) struct WcPopupMenuPlacement {
    side: String,
    align: String,
}

fn append_items(builder: &mut MenuBuilder, items: Vec<WcPopupMenuItem>) -> Result<(), String> {
    for item in items {
        if item.separator == Some(true) {
            builder.separator();
            continue;
        }
        let id = item.id.unwrap_or_default();
        let label = item.text.unwrap_or_default();
        let disabled = item.disabled == Some(true);
        if let Some(children) = item.sub_menu.filter(|children| !children.is_empty()) {
            let mut submenu = builder.submenu(&id, &label, disabled);
            append_items(&mut submenu, children)?;
            submenu.build().map_err(|error| error.to_string())?;
        } else if let Some(checked) = item.checked {
            builder.check(&id, &label, checked, disabled);
        } else {
            builder.text(&id, &label, disabled);
        }
    }
    Ok(())
}

/// 在 Windows/Linux 打开 WcPopup 菜单，并返回被选择的菜单项 ID。
#[tauri::command]
pub(crate) async fn show_wcpopup_context_menu(
    window: WebviewWindow,
    items: Vec<WcPopupMenuItem>,
    x: f64,
    y: f64,
    device_pixel_ratio: f64,
    dark_mode: bool,
    placement: Option<WcPopupMenuPlacement>,
) -> Result<Option<String>, String> {
    #[cfg(windows)]
    let (window_handle, popup_x, popup_y) = {
        let origin = window.inner_position().map_err(|error| error.to_string())?;
        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        (
            hwnd.0 as isize,
            (origin.x as f64 + x * device_pixel_ratio).round() as i32,
            (origin.y as f64 + y * device_pixel_ratio).round() as i32,
        )
    };
    let scale_factor = window.scale_factor().map_err(|error| error.to_string())?;
    let mut config = Config {
        theme: if dark_mode { Theme::Dark } else { Theme::Light },
        ..Config::default()
    };
    #[cfg(windows)]
    scale_windows_menu(&mut config, scale_factor);
    let (result_sender, result_receiver) = tokio::sync::oneshot::channel();
    let menu_window = window.clone();
    window
        .run_on_main_thread(move || {
            #[cfg(windows)]
            let mut builder = MenuBuilder::new_from_config(window_handle, config);
            #[cfg(target_os = "linux")]
            let mut builder = {
                match menu_window.gtk_window() {
                    Ok(gtk_window) => MenuBuilder::new_for_window_from_config(&gtk_window, config),
                    Err(error) => {
                        let _ = result_sender.send(Err(error.to_string()));
                        return;
                    }
                }
            };
            if let Err(error) = append_items(&mut builder, items) {
                let _ = result_sender.send(Err(error));
                return;
            }
            let menu = match builder.build() {
                Ok(menu) => menu,
                Err(error) => {
                    let _ = result_sender.send(Err(error.to_string()));
                    return;
                }
            };
            #[cfg(windows)]
            if let Err(error) =
                install_windows_menu_bounds(&menu, popup_x, popup_y, placement.as_ref())
            {
                destroy_menu(menu);
                let _ = result_sender.send(Err(error));
                return;
            }
            #[cfg(target_os = "linux")]
            gtk::glib::MainContext::default().spawn_local(async move {
                use gtk::{glib::translate::FromGlibPtrNone, prelude::WidgetExt};
                let mut popup_x = (x * device_pixel_ratio / scale_factor).round() as i32;
                let mut popup_y = (y * device_pixel_ratio / scale_factor).round() as i32;
                if let Some(placement) = placement {
                    let gtk_menu = unsafe {
                        gtk::Menu::from_glib_none(menu.gtk_menu_handle as *mut gtk::ffi::GtkMenu)
                    };
                    let (_, natural) = gtk_menu.preferred_size();
                    if placement.side == "left" {
                        popup_x = popup_x.saturating_sub(natural.width);
                    } else if placement.side != "right" {
                        popup_x = super::wcpopup_menu_position::aligned_menu_axis(
                            popup_x,
                            natural.width,
                            &placement.align,
                        );
                    }
                    if placement.side == "top" {
                        popup_y = popup_y.saturating_sub(natural.height);
                    } else if placement.side == "left" || placement.side == "right" {
                        popup_y = super::wcpopup_menu_position::aligned_menu_axis(
                            popup_y,
                            natural.height,
                            &placement.align,
                        );
                    }
                }
                let selected = menu
                    .popup_at_async(popup_x, popup_y)
                    .await
                    .map(|item| item.id);
                destroy_menu(menu);
                let _ = result_sender.send(Ok(selected));
            });
            #[cfg(windows)]
            {
                use std::{
                    future::Future,
                    task::{Context, Poll},
                };

                // 首次 poll 在 UI 线程安装菜单和键盘 hook；后续只等待所选项。
                let popup_menu = menu.clone();
                let mut selection = Box::pin(async move {
                    popup_menu
                        .popup_at_async(popup_x, popup_y)
                        .await
                        .map(|item| item.id)
                });
                let waker = futures::task::noop_waker();
                match selection.as_mut().poll(&mut Context::from_waker(&waker)) {
                    Poll::Ready(selected) => {
                        destroy_menu(menu);
                        let _ = result_sender.send(Ok(selected));
                    }
                    Poll::Pending => {
                        tauri::async_runtime::spawn(async move {
                            let selected = selection.await;
                            let _ = menu_window.run_on_main_thread(move || {
                                destroy_menu(menu);
                                let _ = result_sender.send(Ok(selected));
                            });
                        });
                    }
                }
            }
        })
        .map_err(|error| error.to_string())?;
    result_receiver.await.map_err(|error| error.to_string())?
}

/// WcPopup 0.9.6 在 Windows 按物理像素布局，需要自行适配窗口所在屏幕的 DPI。
/// 菜单尺寸只跟随系统缩放；devicePixelRatio 仅用于上面的 WebView 点击坐标换算。
#[cfg(windows)]
fn scale_windows_menu(config: &mut Config, scale_factor: f64) {
    let pixels = |value: i32| (value as f64 * scale_factor).round() as i32;
    config.font.dark_font_size *= scale_factor as f32;
    config.font.light_font_size *= scale_factor as f32;
    let size = &mut config.size;
    size.border_size = pixels(size.border_size);
    size.vertical_padding = pixels(size.vertical_padding);
    size.horizontal_padding = pixels(size.horizontal_padding);
    size.item_vertical_padding = pixels(size.item_vertical_padding);
    size.item_horizontal_padding = pixels(size.item_horizontal_padding);
    size.submenu_offset = pixels(size.submenu_offset);
    size.separator_size = pixels(size.separator_size);
    if let Some(icon) = &mut config.icon {
        // 勾选和子菜单箭头大小由字体大小自动推导；仅缩放显式设置的图标间距。
        icon.horizontal_margin = icon.horizontal_margin.map(pixels);
    }
}

/// 在库计算位置之后、窗口显示之前校正实际矩形，保持菜单字号、留白和尺寸。
#[cfg(windows)]
struct WindowsMenuBounds {
    monitor: usize,
    x: i32,
    y: i32,
    placement: Option<WcPopupMenuPlacement>,
}

#[cfg(windows)]
fn install_windows_menu_bounds(
    menu: &wcpopup::Menu,
    x: i32,
    y: i32,
    placement: Option<&WcPopupMenuPlacement>,
) -> Result<(), String> {
    use windows::Win32::{
        Foundation::{HWND, POINT},
        Graphics::Gdi::{MonitorFromPoint, MONITOR_DEFAULTTONEAREST},
        UI::Shell::SetWindowSubclass,
    };
    let monitor = unsafe { MonitorFromPoint(POINT { x, y }, MONITOR_DEFAULTTONEAREST) };
    if monitor.0.is_null() {
        return Err("无法获取菜单所在显示器".to_owned());
    }
    let bounds = Box::into_raw(Box::new(WindowsMenuBounds {
        monitor: monitor.0 as usize,
        x,
        y,
        placement: placement.cloned(),
    }));
    let installed = unsafe {
        SetWindowSubclass(
            HWND(menu.window_handle as *mut std::ffi::c_void),
            Some(menu_bounds_subclass),
            1,
            bounds as usize,
        )
    };
    if !installed.as_bool() {
        unsafe {
            drop(Box::from_raw(bounds));
        }
        return Err("无法安装菜单边界定位处理".to_owned());
    }
    // 子菜单拥有独立的原生窗口，也需要在最终布局时约束位置。
    for item in menu.items() {
        if let Some(submenu) = item.submenu {
            install_windows_menu_bounds(&submenu, x, y, None)?;
        }
    }
    Ok(())
}

#[cfg(windows)]
unsafe extern "system" fn menu_bounds_subclass(
    hwnd: windows::Win32::Foundation::HWND,
    message: u32,
    wparam: windows::Win32::Foundation::WPARAM,
    lparam: windows::Win32::Foundation::LPARAM,
    subclass_id: usize,
    bounds: usize,
) -> windows::Win32::Foundation::LRESULT {
    use windows::Win32::{
        Graphics::Gdi::{GetMonitorInfoW, HMONITOR, MONITORINFO},
        UI::{
            Shell::{DefSubclassProc, RemoveWindowSubclass},
            WindowsAndMessaging::{
                GetWindowRect, SWP_NOMOVE, SWP_NOSIZE, WINDOWPOS, WM_NCDESTROY,
                WM_WINDOWPOSCHANGING,
            },
        },
    };
    let bounds = unsafe { &*(bounds as *const WindowsMenuBounds) };
    if message == WM_WINDOWPOSCHANGING && lparam.0 != 0 {
        // WINDOWPOS 来自系统的同步消息，仅在当前回调中访问；所有数值均为物理像素。
        let position = unsafe { &mut *(lparam.0 as *mut WINDOWPOS) };
        if !position.flags.contains(SWP_NOMOVE) {
            let mut info = MONITORINFO {
                cbSize: std::mem::size_of::<MONITORINFO>() as u32,
                ..Default::default()
            };
            if unsafe {
                GetMonitorInfoW(HMONITOR(bounds.monitor as *mut std::ffi::c_void), &mut info)
            }
            .as_bool()
            {
                let mut rect = windows::Win32::Foundation::RECT::default();
                let (width, height) = if position.flags.contains(SWP_NOSIZE) {
                    if unsafe { GetWindowRect(hwnd, &mut rect) }.is_ok() {
                        (rect.right - rect.left, rect.bottom - rect.top)
                    } else {
                        (0, 0)
                    }
                } else {
                    (position.cx, position.cy)
                };
                if width > 0 {
                    let left = match bounds.placement.as_ref() {
                        Some(placement) if placement.side == "left" => {
                            bounds.x.saturating_sub(width)
                        }
                        Some(placement) if placement.side == "right" => bounds.x,
                        Some(placement) => super::wcpopup_menu_position::aligned_menu_axis(
                            bounds.x,
                            width,
                            &placement.align,
                        ),
                        None => position.x,
                    };
                    position.x = super::wcpopup_menu_position::clamp_menu_left(
                        left,
                        width,
                        info.rcWork.left,
                        info.rcWork.right,
                    );
                }
                if height > 0 {
                    let top = match bounds.placement.as_ref() {
                        Some(placement) if placement.side == "top" => {
                            bounds.y.saturating_sub(height)
                        }
                        Some(placement)
                            if placement.side == "left" || placement.side == "right" =>
                        {
                            super::wcpopup_menu_position::aligned_menu_axis(
                                bounds.y,
                                height,
                                &placement.align,
                            )
                        }
                        _ => position.y,
                    };
                    position.y = super::wcpopup_menu_position::clamp_menu_top(
                        top,
                        height,
                        info.rcWork.top,
                        info.rcWork.bottom,
                    );
                }
            }
        }
    } else if message == WM_NCDESTROY {
        let _ = unsafe { RemoveWindowSubclass(hwnd, Some(menu_bounds_subclass), subclass_id) };
        unsafe {
            drop(Box::from_raw(
                bounds as *const WindowsMenuBounds as *mut WindowsMenuBounds,
            ));
        }
    }
    unsafe { DefSubclassProc(hwnd, message, wparam, lparam) }
}

/// WcPopup 的 Menu 是原生句柄封装，关闭后需要由创建它的 UI 线程销毁。
fn destroy_menu(menu: wcpopup::Menu) {
    #[cfg(windows)]
    unsafe {
        use windows::Win32::{Foundation::HWND, UI::WindowsAndMessaging::DestroyWindow};
        let _ = DestroyWindow(HWND(menu.window_handle as *mut std::ffi::c_void));
    }
    #[cfg(target_os = "linux")]
    unsafe {
        use gtk::{glib::translate::FromGlibPtrNone, prelude::WidgetExt};
        let gtk_menu = gtk::Menu::from_glib_none(menu.gtk_menu_handle as *mut gtk::ffi::GtkMenu);
        gtk_menu.destroy();
    }
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;

    #[test]
    fn menu_scales_for_225_percent_windows_dpi() {
        let mut config = Config::default();
        config.icon.as_mut().unwrap().horizontal_margin = Some(5);
        scale_windows_menu(&mut config, 2.25);

        assert_eq!(config.font.dark_font_size, 27.0);
        assert_eq!(config.font.light_font_size, 27.0);
        assert_eq!(config.size.item_vertical_padding, 18);
        assert_eq!(config.size.item_horizontal_padding, 45);
        assert_eq!(config.size.separator_size, 2);
        assert_eq!(config.size.submenu_offset, -7);
        assert_eq!(config.icon.unwrap().horizontal_margin, Some(11));
    }

    #[test]
    fn menu_preserves_dimensions_at_100_percent_windows_dpi() {
        let mut config = Config::default();
        scale_windows_menu(&mut config, 1.0);

        assert_eq!(config.font.dark_font_size, 12.0);
        assert_eq!(config.font.light_font_size, 12.0);
        assert_eq!(config.size.item_vertical_padding, 8);
        assert_eq!(config.size.item_horizontal_padding, 20);
        assert_eq!(config.size.separator_size, 1);
        assert_eq!(config.size.submenu_offset, -3);
        assert_eq!(config.icon.unwrap().horizontal_margin, None);
    }
}

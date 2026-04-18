use tauri::WebviewWindow;

pub fn init_titlebar(win: &WebviewWindow) {
    #[cfg(any(target_os = "linux", target_os = "windows", target_os = "macos",))]
    {
        #[cfg(target_os = "windows")]
        {
            use tauri::Listener;
            let win2 = win.clone();
            win.listen("decorum-page-load", move |_event| {
                let script_tb = include_str!("./js/titlebar.js");
                win2.eval(script_tb)
                    .unwrap_or_else(|e| println!("decorum error: {:?}", e));
                let mut controls = Vec::new();

                if win2.is_minimizable().unwrap_or(false) {
                    controls.push("minimize");
                }

                if win2.is_maximizable().unwrap_or(false) && win2.is_resizable().unwrap_or(false) {
                    controls.push("maximize");
                }

                if win2.is_closable().unwrap_or(false) {
                    controls.push("close");
                }

                let script_controls = include_str!("./js/controls.js");
                let controls = format!("{:?}", controls);

                // this line finds ["minimize", "maximize", "close"] in the file
                // and replaces it with only the controls enabled for the window
                let script_controls = script_controls.replacen(
                    "[\"minimize\", \"maximize\", \"close\"]",
                    &controls,
                    1,
                );

                win2.eval(script_controls.as_str())
                    .expect("couldn't run js");

                let win3 = win2.clone();
                win2.on_window_event(move |eve| {
                    if let tauri::WindowEvent::CloseRequested { .. } = eve {
                        win3.unlisten(_event.id());
                    }
                });
            });
        }
        #[cfg(target_os = "linux")]
        {
            // 覆盖默认标题栏
            win.create_overlay_titlebar().unwrap();
        }
        #[cfg(target_os = "macos")]
        {
            use tauri_plugin_decorum::WebviewWindowExt;
            // 覆盖默认标题栏
            win.create_overlay_titlebar().unwrap();
            // MacOS标题栏
            win.set_title_bar_style(tauri::TitleBarStyle::Overlay)
                .unwrap();
            // 设置标题栏位置
            win.set_traffic_lights_inset(12.0, 16.0).unwrap();
            // // 设置窗体透明, 使用privateApi
            // win.make_transparent().unwrap();
            // // 设置窗体置顶
            // // NSWindowLevel: https://developer.apple.com/documentation/appkit/nswindowlevel
            // win.set_window_level(25).unwrap();
        }
    }
}

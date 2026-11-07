use super::{
    external_file_drop_tickets::{DropTicket, ExternalFileDrops},
    window_runtime::EDITOR_WINDOW_SESSIONS,
};
use std::{
    path::PathBuf,
    sync::{LazyLock, Mutex},
    time::Instant,
};
use tauri::{Emitter, WebviewWindow};

pub const SCRIPT: &str = include_str!("external_file_drop.js");
pub fn initialization_script(app: &tauri::AppHandle) -> String {
    SCRIPT.replace(
        "__LONANOTE_INVOKE_KEY__",
        &serde_json::to_string(app.invoke_key()).expect("invoke key can be serialized"),
    )
}
pub static DROPS: LazyLock<Mutex<ExternalFileDrops>> =
    LazyLock::new(|| Mutex::new(ExternalFileDrops::default()));

pub fn publish(
    window: &WebviewWindow,
    paths: Vec<PathBuf>,
    x: f64,
    y: f64,
    physical: bool,
) -> Result<(), String> {
    if paths.is_empty() || paths.len() > 256 || !x.is_finite() || !y.is_finite() {
        return Err("无效的文件拖放".into());
    }
    let (owner, session_id, epoch) = EDITOR_WINDOW_SESSIONS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .drag_session(window.label())?;
    let token = uuid::Uuid::new_v4().to_string();
    DROPS.lock().unwrap_or_else(|e| e.into_inner()).insert(
        token.clone(),
        DropTicket {
            source: window.label().into(),
            owner,
            session_id,
            epoch,
            paths,
            created: Instant::now(),
        },
    );
    window
        .emit_to(
            tauri::EventTarget::webview_window(window.label()),
            "lonanote://external-file-drop",
            serde_json::json!({ "token": token, "x": x, "y": y, "physical": physical }),
        )
        .map_err(|e| e.to_string())
}

pub fn install(window: &WebviewWindow) -> anyhow::Result<()> {
    #[cfg(windows)]
    {
        use webview2_com::{
            take_pwstr,
            Microsoft::Web::WebView2::Win32::{
                ICoreWebView2File, ICoreWebView2WebMessageReceivedEventArgs2,
            },
            WebMessageReceivedEventHandler,
        };
        use windows::core::{Interface, PWSTR};
        let target = window.clone();
        window.with_webview(move |webview| unsafe {
            let result = (|| -> windows::core::Result<()> {
                let core = webview.controller().CoreWebView2()?;
                let mut cookie = 0;
                core.add_WebMessageReceived(
                    &WebMessageReceivedEventHandler::create(Box::new(move |_, args| {
                        let Some(args) = args else {
                            return Ok(());
                        };
                        let mut json = PWSTR::null();
                        args.WebMessageAsJson(&mut json)?;
                        let Ok(envelope) = serde_json::from_str::<String>(&take_pwstr(json)) else {
                            return Ok(());
                        };
                        let Ok(envelope) = serde_json::from_str::<serde_json::Value>(&envelope)
                        else {
                            return Ok(());
                        };
                        let data = &envelope["payload"];
                        if envelope["cmd"].as_str() != Some("capture_external_file_drop") {
                            return Ok(());
                        }
                        if data.get("channel").and_then(|v| v.as_str())
                            != Some("lonanote:external-file-drop")
                        {
                            return Ok(());
                        }
                        let mut source = PWSTR::null();
                        args.Source(&mut source)?;
                        let source = take_pwstr(source);
                        let trusted = target
                            .url()
                            .ok()
                            .zip(tauri::Url::parse(&source).ok())
                            .is_some_and(|(current, source)| current.origin() == source.origin());
                        if !trusted {
                            log::warn!(
                                "[external-file-drop] rejected message origin: window={}",
                                target.label()
                            );
                            return Ok(());
                        }
                        log::info!(
                            "[external-file-drop] native received: window={}",
                            target.label()
                        );
                        let received = (|| -> windows::core::Result<Vec<PathBuf>> {
                            let objects = args
                                .cast::<ICoreWebView2WebMessageReceivedEventArgs2>()?
                                .AdditionalObjects()?;
                            let mut count = 0;
                            objects.Count(&mut count)?;
                            if count == 0 || count > 256 {
                                return Err(windows::core::Error::from(
                                    windows::Win32::Foundation::E_INVALIDARG,
                                ));
                            }
                            let mut paths = Vec::new();
                            for index in 0..count {
                                let file = objects
                                    .GetValueAtIndex(index)?
                                    .cast::<ICoreWebView2File>()?;
                                let mut path = PWSTR::null();
                                file.Path(&mut path)?;
                                paths.push(PathBuf::from(take_pwstr(path)));
                            }
                            Ok(paths)
                        })()
                        .map_err(|error| error.to_string());
                        let x = data["x"].as_f64().unwrap_or(f64::NAN);
                        let y = data["y"].as_f64().unwrap_or(f64::NAN);
                        let result =
                            received.and_then(|paths| publish(&target, paths, x, y, false));
                        if let Err(error) = result {
                            log::warn!(
                                "[external-file-drop] native failed: window={}, error={error}",
                                target.label()
                            );
                            let _ = target.emit_to(
                                tauri::EventTarget::webview_window(target.label()),
                                "lonanote://external-file-drop",
                                serde_json::json!({ "error": error, "x": x, "y": y }),
                            );
                        } else {
                            log::info!(
                                "[external-file-drop] native published: window={}",
                                target.label()
                            );
                        }
                        Ok(())
                    })),
                    &mut cookie,
                )?;
                Ok(())
            })();
            if let Err(error) = result {
                log::error!("安装外部文件拖放接收器失败：{error}");
            }
        })?;
    }
    #[cfg(target_os = "linux")]
    {
        let target = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, position }) =
                event
            {
                if let Err(error) = publish(
                    &target,
                    paths.clone(),
                    position.x as f64,
                    position.y as f64,
                    true,
                ) {
                    log::warn!("外部文件拖放失败：{error}");
                }
            }
        });
    }
    let _ = window;
    Ok(())
}

#[cfg(target_os = "macos")]
pub fn macos_drag_paths() -> Vec<PathBuf> {
    use objc2::{class, msg_send, runtime::AnyObject};
    use std::ffi::CStr;
    // 只读取系统当前的文件拖放 pasteboard，不接受 renderer 提交任意绝对路径。
    unsafe {
        let name: *mut AnyObject =
            msg_send![class!(NSString), stringWithUTF8String: c"NSDragPboard".as_ptr()];
        let kind: *mut AnyObject =
            msg_send![class!(NSString), stringWithUTF8String: c"NSFilenamesPboardType".as_ptr()];
        let pasteboard: *mut AnyObject = msg_send![class!(NSPasteboard), pasteboardWithName: name];
        let files: *mut AnyObject = msg_send![pasteboard, propertyListForType: kind];
        if files.is_null() {
            return vec![];
        }
        let is_array: bool = msg_send![files, isKindOfClass: class!(NSArray)];
        if !is_array {
            return vec![];
        }
        let count: usize = msg_send![files, count];
        if count > 256 {
            return vec![];
        }
        (0..count)
            .filter_map(|index| {
                let file: *mut AnyObject = msg_send![files, objectAtIndex: index];
                let is_string: bool = msg_send![file, isKindOfClass: class!(NSString)];
                if !is_string {
                    return None;
                }
                let value: *const std::ffi::c_char = msg_send![file, UTF8String];
                (!value.is_null())
                    .then(|| PathBuf::from(CStr::from_ptr(value).to_string_lossy().into_owned()))
            })
            .collect()
    }
}

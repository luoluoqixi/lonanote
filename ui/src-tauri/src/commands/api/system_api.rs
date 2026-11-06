use tauri_plugin_clipboard_manager::ClipboardExt;

use crate::APP_HANDLE;

#[tauri::command]
pub(crate) async fn exit_app() -> Result<bool, String> {
    let app = APP_HANDLE
        .get()
        .ok_or_else(|| "Tauri app handle 尚未初始化".to_string())?;
    crate::setup::window_close::request_close(app.clone(), None).await
}

#[tauri::command]
pub(crate) fn read_clipboard_text() -> Result<String, String> {
    let app = APP_HANDLE
        .get()
        .ok_or_else(|| "Tauri app handle 尚未初始化".to_string())?;
    app.clipboard()
        .read_text()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn write_clipboard_text(text: String) -> Result<(), String> {
    let app = APP_HANDLE
        .get()
        .ok_or_else(|| "Tauri app handle 尚未初始化".to_string())?;
    app.clipboard()
        .write_text(text)
        .map_err(|error| error.to_string())
}

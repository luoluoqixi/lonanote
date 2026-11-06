// 复用桌面纯状态测试，避免其验证依赖 WebView 与系统窗口运行库。
#[path = "../../../ui/src-tauri/src/setup/file_ownership.rs"]
mod file_ownership;
#[path = "../../../ui/src-tauri/src/setup/window_geometry.rs"]
mod window_geometry;
#[path = "../../../ui/src-tauri/src/setup/window_sessions.rs"]
mod window_sessions;
#[path = "../../../ui/src-tauri/src/setup/workspace_access.rs"]
mod workspace_access;

#[path = "../../../ui/src-tauri/src/setup/document_save_paths.rs"]
mod document_save_paths;

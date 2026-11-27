// 单独验证保留的窗口会话，避免测试进程加载 GUI / WebView2 DLL。
#![allow(dead_code)]
#[path = "../src/setup/editor_window_sessions.rs"]
mod editor_window_sessions;
#[path = "../src/setup/window_sessions.rs"]
mod window_sessions;
#[path = "../src/setup/workspace_access.rs"]
mod workspace_access;
#[path = "../src/setup/workspace_window_launch.rs"]
mod workspace_window_launch;

use std::sync::LazyLock;

use super::window_sessions::WindowSessions;

// 桌面运行时共享实例；纯状态模块不持有全局单例，供独立测试复用。
pub static WINDOW_SESSIONS: LazyLock<WindowSessions> = LazyLock::new(WindowSessions::default);

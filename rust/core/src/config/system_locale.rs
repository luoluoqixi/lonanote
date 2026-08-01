use std::sync::{LazyLock, RwLock};

const FALLBACK_SYSTEM_LOCALE: &str = "en";

static SYSTEM_LOCALE: LazyLock<RwLock<String>> =
    LazyLock::new(|| RwLock::new(FALLBACK_SYSTEM_LOCALE.to_string()));

/// 由平台启动入口写入当前系统的 BCP 47 locale。
///
/// 空值统一回退到英文，保证 Core 即使在测试或异常启动路径中也有稳定的默认值。
pub fn init_system_locale(locale: impl AsRef<str>) {
    let locale = locale.as_ref().trim();
    let locale = if locale.is_empty() {
        FALLBACK_SYSTEM_LOCALE
    } else {
        locale
    };
    *SYSTEM_LOCALE.write().unwrap() = locale.to_string();
}

/// 返回平台在启动期写入的当前系统 locale。
pub fn system_locale() -> String {
    SYSTEM_LOCALE.read().unwrap().clone()
}

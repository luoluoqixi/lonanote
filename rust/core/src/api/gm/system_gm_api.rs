use cmdreg::command;

/// 返回 Rust Core 在启动期保存的系统 locale。
#[command("gm.system")]
async fn get_system_locale() -> String {
    crate::config::system_locale::system_locale()
}

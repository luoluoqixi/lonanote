use tauri::{plugin::TauriPlugin, Runtime};

pub static LOG_INFO_LIST: &[&str] = &["lonanote", "lonanote_lib", "lonanote-core"];
pub static LOG_THIRD_LIST: &[&str] = &["tao"];

pub fn init_tauri_log<R: Runtime>() -> TauriPlugin<R> {
    let third_log_filter = if cfg!(debug_assertions) {
        log::LevelFilter::Info
    } else {
        log::LevelFilter::Error
    };
    let mut tauri_log = tauri_plugin_log::Builder::new();
    {
        tauri_log = tauri_log
            .max_file_size(50_000 /* bytes */)
            .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
            .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::LogDir {
                    file_name: Some("logs".to_string()),
                },
            ))
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::Webview,
            ))
            .level(log::LevelFilter::Info);

        for n in LOG_INFO_LIST.iter() {
            tauri_log = tauri_log.level_for(*n, log::LevelFilter::Info);
        }
        for n in LOG_THIRD_LIST.iter() {
            tauri_log = tauri_log.level_for(*n, third_log_filter);
        }
    }
    tauri_log
        .level_for(
            "tao::platform_impl::platform::event_loop::runner",
            log::LevelFilter::Error,
        )
        .build()
}

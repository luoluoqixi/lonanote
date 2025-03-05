use anyhow::Result;

pub mod fs_utils;
pub mod time_utils;

pub fn init_logger() -> Result<()> {
    fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{: <5}: {}: {}",
                record.level(),
                chrono::Local::now().format("%H:%M:%S"),
                message
            ))
        })
        .chain(
            fern::Dispatch::new()
                .level(log::LevelFilter::Warn)
                .level_for("lonanote-core-node", log::LevelFilter::Info)
                .level_for("lonanote_core_node", log::LevelFilter::Info)
                .level_for("lonanote-core", log::LevelFilter::Info)
                .level_for("lonanote_core", log::LevelFilter::Info)
                .chain(std::io::stdout()),
        )
        .apply()?;
    Ok(())
}

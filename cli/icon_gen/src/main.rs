use anyhow::Result;
use colored::Colorize;
use log::error;

fn _main() -> Result<()> {
    icon_gen::generate_icons()?;

    Ok(())
}

fn init_logger() {
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
                .level_for("icon_gen", log::LevelFilter::Info)
                .chain(std::io::stdout()),
        )
        .apply()
        .unwrap();
}

fn main() {
    init_logger();
    if let Err(err) = _main() {
        error!("{:#?}", err.to_string().red());
    }
}

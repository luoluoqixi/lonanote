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

pub fn read_string(bytes: &[u8]) -> String {
    // unsafe { std::str::from_utf8_unchecked(&output).trim().to_string() }
    let encodings = [
        encoding_rs::UTF_8,
        encoding_rs::GBK,
        encoding_rs::SHIFT_JIS,
        encoding_rs::WINDOWS_1252,
        encoding_rs::EUC_JP,
    ];
    for encoding in encodings.iter() {
        let (decoded, _, had_errors) = encoding.decode(bytes);
        if !had_errors {
            return decoded.into_owned();
        }
    }
    let (fallback, _, _) = encoding_rs::UTF_8.decode(bytes);
    fallback.into_owned()
}

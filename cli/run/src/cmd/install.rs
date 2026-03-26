use log::info;

use crate::{config::FLUTTER_PROJECT_PATH, run::flutter};

pub fn install() -> anyhow::Result<()> {
    flutter::run_flutter_install(FLUTTER_PROJECT_PATH.to_str().unwrap())?;

    info!("install all finish");

    Ok(())
}

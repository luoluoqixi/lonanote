use log::info;

use crate::{config::EDITOR_PROJECT_PATH, run};

pub fn install() -> anyhow::Result<()> {
    run::run_npm_install(EDITOR_PROJECT_PATH.to_str().unwrap())?;

    info!("install all finish");

    Ok(())
}

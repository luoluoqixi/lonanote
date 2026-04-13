use log::info;

use crate::{config::UI_PROJECT_PATH, run::npm};

pub fn install() -> anyhow::Result<()> {
    npm::run_npm_install(UI_PROJECT_PATH.to_str().unwrap())?;

    info!("install all finish");

    Ok(())
}

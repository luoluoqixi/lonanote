use log::info;

use crate::{path::EDITOR_PROJECT_PATH, run};

pub async fn install() -> anyhow::Result<()> {
    run::run_npm_install(EDITOR_PROJECT_PATH.to_str().unwrap()).await?;

    info!("install all finish");

    Ok(())
}

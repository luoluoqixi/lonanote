use log::info;

use crate::{
    config::{
        FLUTTER_EDITOR_PROJECT_PATH, FLUTTER_PROJECT_PATH, TS_NODE_PROJECT_PATH, TS_PROJECT_PATH,
    },
    run::{flutter, npm},
};

pub fn install() -> anyhow::Result<()> {
    npm::run_npm_install(TS_PROJECT_PATH.to_str().unwrap())?;
    npm::run_npm_install(TS_NODE_PROJECT_PATH.to_str().unwrap())?;
    npm::run_npm_install(FLUTTER_EDITOR_PROJECT_PATH.to_str().unwrap())?;
    npm::run_npm_build(FLUTTER_EDITOR_PROJECT_PATH.to_str().unwrap())?;
    flutter::run_flutter_install(FLUTTER_PROJECT_PATH.to_str().unwrap())?;

    info!("install all finish");

    Ok(())
}

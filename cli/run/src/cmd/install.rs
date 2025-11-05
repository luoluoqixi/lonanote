use log::info;

use crate::{
    config::{
        EDITOR_PROJECT_PATH, FLUTTER_PROJECT_PATH, FLUTTER_RUST_BUILDER_PROJECT_PATH,
        FLUTTER_RUST_BUILDTOOL_PROJECT_PATH,
    },
    run::{flutter, npm},
};

pub fn install() -> anyhow::Result<()> {
    npm::run_npm_install(EDITOR_PROJECT_PATH.to_str().unwrap())?;
    npm::run_npm_build(EDITOR_PROJECT_PATH.to_str().unwrap())?;
    flutter::run_flutter_install(FLUTTER_PROJECT_PATH.to_str().unwrap())?;
    flutter::run_flutter_install(FLUTTER_RUST_BUILDER_PROJECT_PATH.to_str().unwrap())?;
    flutter::run_flutter_install(FLUTTER_RUST_BUILDTOOL_PROJECT_PATH.to_str().unwrap())?;

    info!("install all finish");

    Ok(())
}

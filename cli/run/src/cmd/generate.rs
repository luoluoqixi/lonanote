use log::info;

use crate::{
    config::{FLUTTER_CORE_PROJECT_PATH, FLUTTER_PROJECT_PATH},
    run::{cargo, dart},
};

pub fn generate_rust_code() -> anyhow::Result<()> {
    cargo::run_cargo_bin(
        "flutter_rust_bridge_codegen",
        FLUTTER_CORE_PROJECT_PATH.to_str().unwrap(),
        &["generate"],
    )?;
    info!("generate rust code finish");

    Ok(())
}

pub fn generate_dart_code() -> anyhow::Result<()> {
    dart::run_dart_build_runner(FLUTTER_PROJECT_PATH.to_str().unwrap())?;
    dart::run_dart_build_runner(FLUTTER_CORE_PROJECT_PATH.to_str().unwrap())?;
    info!("generate dart code finish");

    Ok(())
}

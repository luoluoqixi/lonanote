use log::info;

use crate::{config::UI_PROJECT_PATH, run::npm};

#[allow(non_camel_case_types)]
#[derive(PartialEq)]
pub enum BuildPlatform {
    Windows,
    MacOS,
    Linux,
    Android,
    iOS,
}

pub fn build(_: BuildPlatform) -> anyhow::Result<()> {
    // let build_type = match platform {
    //     BuildPlatform::Windows => "win",
    //     BuildPlatform::MacOS => "mac",
    //     BuildPlatform::Linux => "linux",
    //     BuildPlatform::Android => "apk",
    //     BuildPlatform::iOS => "ipa",
    // };
    npm::run_npm_build(UI_PROJECT_PATH.to_str().unwrap())?;

    info!("build all finish");

    Ok(())
}

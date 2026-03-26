use log::info;

use crate::{config::FLUTTER_PROJECT_PATH, run::flutter};

#[allow(non_camel_case_types)]
#[derive(PartialEq)]
pub enum BuildPlatform {
    Windows,
    MacOS,
    Linux,
    Android,
    iOS,
}

pub fn build(platform: BuildPlatform) -> anyhow::Result<()> {
    let build_type = match platform {
        BuildPlatform::Windows => "win",
        BuildPlatform::MacOS => "mac",
        BuildPlatform::Linux => "linux",
        BuildPlatform::Android => "apk",
        BuildPlatform::iOS => "ipa",
    };
    flutter::run_flutter_build(FLUTTER_PROJECT_PATH.to_str().unwrap(), build_type)?;

    info!("build all finish");

    Ok(())
}

pub fn build_run() -> anyhow::Result<()> {
    let mut flutter_child =
        flutter::run_flutter_dev_release(FLUTTER_PROJECT_PATH.to_str().unwrap())?;
    flutter_child.wait()?;

    Ok(())
}

use log::info;

use crate::{
    config::{FLUTTER_EDITOR_PROJECT_PATH, FLUTTER_PROJECT_PATH, TS_PROJECT_PATH},
    run::{flutter, npm},
};

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

    if platform == BuildPlatform::Android || platform == BuildPlatform::iOS {
        npm::run_npm_build(FLUTTER_EDITOR_PROJECT_PATH.to_str().unwrap())?;
        flutter::run_flutter_build(FLUTTER_PROJECT_PATH.to_str().unwrap(), build_type)?;
    } else {
        npm::run_npm_build_platform(TS_PROJECT_PATH.to_str().unwrap(), build_type)?;
    }

    info!("build all finish");

    Ok(())
}

pub fn build_run_mobile() -> anyhow::Result<()> {
    npm::run_npm_build(FLUTTER_EDITOR_PROJECT_PATH.to_str().unwrap())?;
    let mut flutter_child =
        flutter::run_flutter_dev_release(FLUTTER_PROJECT_PATH.to_str().unwrap())?;
    flutter_child.wait()?;

    Ok(())
}

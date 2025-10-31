use log::info;

use crate::{
    path::{EDITOR_PROJECT_PATH, FLUTTER_PROJECT_PATH},
    run, utils,
};

#[allow(non_camel_case_types)]
pub enum BuildPlatform {
    Windows,
    MacOS,
    Linux,
    Android,
    iOS,
}

pub async fn build(platform: BuildPlatform) -> anyhow::Result<()> {
    let build_type = match platform {
        BuildPlatform::Windows => "windows",
        BuildPlatform::MacOS => "macos",
        BuildPlatform::Linux => "linux",
        BuildPlatform::Android => "apk",
        BuildPlatform::iOS => "ipa",
    };
    run::run_npm_build(EDITOR_PROJECT_PATH.to_str().unwrap()).await?;
    run::run_flutter_build(FLUTTER_PROJECT_PATH.to_str().unwrap(), build_type).await?;

    info!("build all finish");

    Ok(())
}

pub async fn build_run() -> anyhow::Result<()> {
    run::run_npm_build(EDITOR_PROJECT_PATH.to_str().unwrap()).await?;
    let flutter_child = run::run_flutter_dev_release(FLUTTER_PROJECT_PATH.to_str().unwrap()).await;
    let [flutter_child] = utils::stop_error([flutter_child], true).await?;
    flutter_child.wait_with_output().await?;

    Ok(())
}

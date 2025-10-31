mod cmd;
mod path;
mod run;
mod utils;

use clap::Parser;
use log::{error, info};

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Opt {
    cmd: String,
}

#[tokio::main]
async fn main() {
    utils::init_logger();
    let opt = Opt::parse();
    info!("run command: {}", opt.cmd);

    match opt.cmd.as_str() {
        "install" => cmd::install().await.unwrap(),
        "dev" => cmd::dev().await.unwrap(),
        "build:run" => cmd::build_run().await.unwrap(),
        "build:win" => cmd::build(cmd::BuildPlatform::Windows).await.unwrap(),
        "build:mac" => cmd::build(cmd::BuildPlatform::MacOS).await.unwrap(),
        "build:linux" => cmd::build(cmd::BuildPlatform::Linux).await.unwrap(),
        "build:android" => cmd::build(cmd::BuildPlatform::Android).await.unwrap(),
        "build:ios" => cmd::build(cmd::BuildPlatform::iOS).await.unwrap(),
        "icon" => icon_gen::generate_icons().unwrap(),
        _ => {
            error!("Unknown command: {}", opt.cmd);
        }
    }
}

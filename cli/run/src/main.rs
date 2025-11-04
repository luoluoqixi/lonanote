mod cmd;
mod config;
mod run;
mod utils;

use clap::Parser;
use log::{error, info};

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Opt {
    cmd: String,
}

fn main() {
    utils::init_logger();
    let opt = Opt::parse();
    info!("run command: {}", opt.cmd);

    match opt.cmd.as_str() {
        "install" => cmd::install().unwrap(),
        "dev" => cmd::dev().unwrap(),
        "build:run" => cmd::build_run().unwrap(),
        "build:win" => cmd::build(cmd::BuildPlatform::Windows).unwrap(),
        "build:mac" => cmd::build(cmd::BuildPlatform::MacOS).unwrap(),
        "build:linux" => cmd::build(cmd::BuildPlatform::Linux).unwrap(),
        "build:android" => cmd::build(cmd::BuildPlatform::Android).unwrap(),
        "build:ios" => cmd::build(cmd::BuildPlatform::iOS).unwrap(),
        "icon" => icon_gen::generate_icons().unwrap(),
        _ => {
            error!("Unknown command: {}", opt.cmd);
        }
    }
}

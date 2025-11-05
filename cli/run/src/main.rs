mod cmd;
mod config;
mod run;
mod utils;

use clap::Parser;
use colored::Colorize;
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
        "build" => cmd::build_run().unwrap(),
        "build:win" => cmd::build(cmd::BuildPlatform::Windows).unwrap(),
        "build:mac" => cmd::build(cmd::BuildPlatform::MacOS).unwrap(),
        "build:linux" => cmd::build(cmd::BuildPlatform::Linux).unwrap(),
        "build:android" => cmd::build(cmd::BuildPlatform::Android).unwrap(),
        "build:ios" => cmd::build(cmd::BuildPlatform::iOS).unwrap(),
        "gen:rust" => cmd::generate_rust_code().unwrap(),
        "gen:dart" => cmd::generate_dart_code().unwrap(),
        "icon" => icon_gen::generate_icons().unwrap(),
        _ => {
            error!("{}", format!("Unknown command: {}", opt.cmd).red());
        }
    }
}

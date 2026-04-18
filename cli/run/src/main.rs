mod cmd;
mod config;
mod run;

use clap::Parser;
use colored::Colorize;
use log::{error, info};

use crate::config::{CommandConfig, RUN_CONFIG};

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Opt {
    cmd: String,

    // <release> args
    #[arg(long, default_value_t = false)]
    major: bool,
    #[arg(long, default_value_t = false)]
    minor: bool,
    #[arg(long, default_value_t = false)]
    patch: bool,
    #[arg(long, default_value_t = false)]
    push: bool,
}

fn run_command(command: &CommandConfig) -> anyhow::Result<()> {
    let current_os = std::env::consts::OS;
    let cmds = match current_os {
        "windows" => command.cmds_windows.as_ref(),
        "macos" => command.cmds_macos.as_ref(),
        "linux" => command.cmds_linux.as_ref(),
        _ => None,
    }
    .or(command.cmds.as_ref());

    if let Some(cmds) = cmds {
        run::run_cmds(cmds)?;
    } else {
        error!(
            "{}",
            format!("No commands found for the current OS: {}", current_os).red()
        );
    }
    Ok(())
}

fn main() {
    utils::init_logger(&["run"]);
    let opt = Opt::parse();
    info!("run command: {}", opt.cmd);

    let config = &RUN_CONFIG;
    if opt.cmd == "help" {
        println!("Available commands:");
        for command in &config.commands {
            println!(
                "  {} - {}",
                command.name.green(),
                command.description.as_deref().unwrap_or("")
            );
        }
    } else if opt.cmd == "release" {
        cmd::release(
            opt.major,
            opt.minor,
            opt.patch,
            opt.push,
            &config.release_projects,
        )
        .unwrap();
    } else if let Some(command) = config.commands.iter().find(|c| c.name == opt.cmd) {
        run_command(command).unwrap();
    } else {
        error!("{}", format!("Unknown command: {}", opt.cmd).red());
    }
}

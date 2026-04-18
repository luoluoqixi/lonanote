pub mod cargo;
pub mod git;

use colored::Colorize;
use log::{error, info};
use std::{
    io::Write,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};

use crate::config::{Cmd, REPO_ROOT};

static EMPTY_ARGS: &[String] = &[];

fn filter_cmds(cmds: &[Cmd], always_run: bool) -> Vec<&Cmd> {
    cmds.iter()
        .filter(|cmd| cmd.always_run.unwrap_or(false) == always_run)
        .collect()
}

fn run_cmd(cmd: &Cmd) -> anyhow::Result<std::process::Child> {
    let repo_root = &REPO_ROOT;
    let repo_root_str = repo_root.to_str().unwrap().to_string();
    let command = &cmd.cmd;
    let run_dir = cmd
        .run_dir
        .as_ref()
        .map(|dir| repo_root.join(dir).to_str().unwrap().to_string())
        .unwrap_or(repo_root_str);

    let args = cmd.args.as_deref().unwrap_or(EMPTY_ARGS);

    info!("run cmd: {} {}, on {}", command, args.join(" "), &run_dir);
    if cmd.which_cargo_install.unwrap_or(false) {
        cargo::run_cargo_bin(command, run_dir, args)
    } else {
        utils::cmd::run_command_which_println(command, run_dir, args)
    }
}

pub fn run_always_cmds(cmds: &[&Cmd]) -> anyhow::Result<()> {
    let running = Arc::new(AtomicBool::new(true));

    let mut receive_input_index = None;
    let mut children = Vec::new();
    for (i, cmd) in cmds.iter().enumerate() {
        let child = run_cmd(cmd).map_err(|err| anyhow::anyhow!("Failed to run command: {err}"))?;
        info!("cmd pid: {:?}", child.id());
        children.push(child);
        if cmd.always_run_receive_input.unwrap_or(false) {
            receive_input_index.replace(i);
        }
    }

    let ids = children.iter().map(|child| child.id()).collect::<Vec<_>>();

    let (tx, rx) = std::sync::mpsc::channel::<String>();
    utils::start_stdin_watch(&running, tx);
    {
        let running = Arc::clone(&running);
        ctrlc::set_handler(move || {
            info!("stop signal...");
            for id in ids.iter() {
                utils::stop_pid(*id).unwrap_or_else(|e| error!("{}", e.to_string().red()));
            }
            running.store(false, Ordering::SeqCst);
            info!("stop finish");
        })
        .expect("Error setting Ctrl+C handler");
    }

    let mut input_child = if let Some(receive_input_index) = receive_input_index {
        let child = &mut children[receive_input_index];
        Some(child.stdin.take().unwrap())
    } else {
        None
    };

    while running.load(Ordering::SeqCst) {
        if let Some(child_stdin) = input_child.as_mut() {
            if let Ok(line) = rx.try_recv() {
                if line.is_empty() {
                    continue;
                }
                info!("send input: {line}");
                if let Err(e) = child_stdin.write_all(format!("{line}\n").as_bytes()) {
                    error!(
                        "{}",
                        format!("Failed to write to input_child stdin: {e}").red()
                    );
                }
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    Ok(())
}

pub fn run_cmds(cmds: &[Cmd]) -> anyhow::Result<()> {
    let always_run_cmds = filter_cmds(cmds, true);
    let sync_cmds = filter_cmds(cmds, false);

    if !sync_cmds.is_empty() {
        for cmd in sync_cmds.iter() {
            run_cmd(cmd)
                .map_err(|err| anyhow::anyhow!("Failed to run command: {err}"))?
                .wait()
                .map_err(|err| anyhow::anyhow!("Failed to wait for command: {err}"))?;
        }
    }
    if !always_run_cmds.is_empty() {
        run_always_cmds(&always_run_cmds)?;
    }
    Ok(())
}

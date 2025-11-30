use colored::Colorize;
use log::{error, info};
use std::{
    io::Write,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};

use crate::{
    config::{FLUTTER_EDITOR_PROJECT_PATH, FLUTTER_PROJECT_PATH, TS_PROJECT_PATH},
    run::{flutter, npm},
    utils,
};

pub fn dev_flutter() -> anyhow::Result<()> {
    let running = Arc::new(AtomicBool::new(true));

    #[allow(clippy::zombie_processes)]
    let dev_child = npm::run_npm_dev(FLUTTER_EDITOR_PROJECT_PATH.to_str().unwrap())
        .map_err(|err| error!("{}", format!("run dev failed: {err}").red()))
        .unwrap();

    #[allow(clippy::zombie_processes)]
    let mut flutter_child = flutter::run_flutter_dev(FLUTTER_PROJECT_PATH.to_str().unwrap())
        .map_err(|err| error!("{}", format!("run flutter failed: {err}").red()))
        .unwrap();

    let dev_id = dev_child.id();
    let flutter_id = flutter_child.id();
    info!("dev pid: {dev_id}");
    info!("flutter pid: {flutter_id}");

    let (tx, rx) = std::sync::mpsc::channel::<String>();
    utils::start_stdin_watch(&running, tx);

    {
        let running = Arc::clone(&running);
        ctrlc::set_handler(move || {
            info!("stop signal...");
            utils::stop_pid(dev_id).unwrap_or_else(|e| error!("{}", e.to_string().red()));
            utils::stop_pid(flutter_id).unwrap_or_else(|e| error!("{}", e.to_string().red()));
            running.store(false, Ordering::SeqCst);
            info!("stop finish");
        })
        .expect("Error setting Ctrl+C handler");
    }

    let mut child_stdin = flutter_child.stdin.take().unwrap();
    while running.load(Ordering::SeqCst) {
        if let Ok(line) = rx.try_recv() {
            if line.is_empty() {
                continue;
            }
            info!("send flutter: {line}");
            if let Err(e) = child_stdin.write_all(format!("{line}\n").as_bytes()) {
                error!(
                    "{}",
                    format!("Failed to write to flutter_child stdin: {e}").red()
                );
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    Ok(())
}

pub fn dev_ts() -> anyhow::Result<()> {
    let running = Arc::new(AtomicBool::new(true));

    #[allow(clippy::zombie_processes)]
    let dev_child = npm::run_npm_dev(TS_PROJECT_PATH.to_str().unwrap())
        .map_err(|err| error!("{}", format!("run dev failed: {err}").red()))
        .unwrap();

    let dev_id = dev_child.id();
    info!("dev pid: {dev_id}");

    let (tx, _) = std::sync::mpsc::channel::<String>();
    utils::start_stdin_watch(&running, tx);

    {
        let running = Arc::clone(&running);
        ctrlc::set_handler(move || {
            info!("stop signal...");
            utils::stop_pid(dev_id).unwrap_or_else(|e| error!("{}", e.to_string().red()));
            running.store(false, Ordering::SeqCst);
            info!("stop finish");
        })
        .expect("Error setting Ctrl+C handler");
    }

    while running.load(Ordering::SeqCst) {
        std::thread::sleep(std::time::Duration::from_millis(100));
    }

    Ok(())
}

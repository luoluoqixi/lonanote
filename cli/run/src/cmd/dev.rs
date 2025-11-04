use std::{
    io::{BufRead, Write},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};

use log::info;

use crate::{
    config::{EDITOR_PROJECT_PATH, FLUTTER_PROJECT_PATH},
    run, utils,
};

pub fn dev() -> anyhow::Result<()> {
    let running = Arc::new(AtomicBool::new(true));

    #[allow(clippy::zombie_processes)]
    let dev_child = run::run_npm_dev(EDITOR_PROJECT_PATH.to_str().unwrap())
        .map_err(|err| log::error!("run npm dev failed: {err}"))
        .unwrap();

    #[allow(clippy::zombie_processes)]
    let mut flutter_child = run::run_flutter_dev(FLUTTER_PROJECT_PATH.to_str().unwrap())
        .map_err(|err| log::error!("run flutter failed: {err}"))
        .unwrap();

    let dev_id = dev_child.id();
    let flutter_id = flutter_child.id();
    info!("dev pid: {dev_id}");
    info!("flutter pid: {flutter_id}");

    let mut stdin = flutter_child.stdin.take().unwrap();

    let running_thread = std::thread::spawn({
        let running_clone = Arc::clone(&running);

        move || {
            let mut stdin_lock = std::io::stdin().lock();
            let mut buffer = String::new();
            while running_clone.load(Ordering::SeqCst) {
                // println!("running...");
                // std::thread::sleep(std::time::Duration::from_millis(100));

                if stdin_lock.read_line(&mut buffer).is_ok() {
                    let trimmed_line = buffer.trim();
                    if trimmed_line.is_empty() {
                        log::info!("Empty line, skipping");
                        buffer.clear();
                        continue;
                    }
                    log::info!("Sending to flutter: {trimmed_line}");
                    if let Err(e) = stdin.write_all(format!("{trimmed_line}\n").as_bytes()) {
                        log::error!("Failed to write to flutter_child stdin: {e}");
                        break;
                    }
                    log::info!("Sending to flutter end");
                    buffer.clear();
                }
            }
        }
    });

    ctrlc::set_handler({
        move || {
            info!("stop signal...");
            utils::stop_pid(dev_id).unwrap_or_else(|e| log::error!("{e}"));
            utils::stop_pid(flutter_id).unwrap_or_else(|e| log::error!("{e}"));
            running.store(false, Ordering::SeqCst);
            info!("stop finish");
        }
    })
    .expect("Error setting Ctrl+C handler");

    running_thread.join().expect("running thread panicked");

    Ok(())
}

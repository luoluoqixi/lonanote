#![allow(dead_code)]
use colored::Colorize;
use log::{error, info};

pub fn init_logger() {
    fern::Dispatch::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "{: <5}: {}: {}",
                record.level(),
                chrono::Local::now().format("%H:%M:%S"),
                message
            ))
        })
        .chain(
            fern::Dispatch::new()
                .level(log::LevelFilter::Warn)
                .level_for("run", log::LevelFilter::Info)
                .chain(std::io::stdout()),
        )
        .apply()
        .unwrap();
}

pub fn stop_pid(pid: u32) -> anyhow::Result<()> {
    kill_tree::blocking::kill_tree(pid)
        .map_err(|err| anyhow::anyhow!("kill process tree failed for pid: {pid}, error: {err}"))?;

    Ok(())
}

pub fn start_stdin_watch(
    running: &std::sync::Arc<std::sync::atomic::AtomicBool>,
    tx: std::sync::mpsc::Sender<String>,
) -> std::thread::JoinHandle<()> {
    use std::io::BufRead;

    let running_clone = std::sync::Arc::clone(running);
    std::thread::spawn(move || {
        let stdin = std::io::stdin();
        let mut stdin_lock = stdin.lock();
        let mut buffer = String::new();

        while running_clone.load(std::sync::atomic::Ordering::SeqCst) {
            buffer.clear();
            match stdin_lock.read_line(&mut buffer) {
                Ok(0) => break, // EOF
                Ok(_) => {
                    let trimmed = buffer.trim().to_string();
                    if tx.send(trimmed).is_err() {
                        break;
                    }
                }
                Err(e) => {
                    error!("{}", format!("Error reading stdin: {e}").red());
                    break;
                }
            }
        }
        info!("stdin thread exit");
    })
}

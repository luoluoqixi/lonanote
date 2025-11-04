#![allow(dead_code)]

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

pub fn parse_bytes(bytes: &[u8]) -> Result<String, String> {
    let (cow, _, had_errors) = encoding_rs::UTF_8.decode(bytes);
    if had_errors {
        let (cow, _, had_errors) = encoding_rs::GBK.decode(bytes);
        if had_errors {
            Err(format!("parse bytes error: {cow}"))
        } else {
            Ok(cow.to_string())
        }
    } else {
        Ok(cow.to_string())
    }
}

pub fn create_command<S, I>(cmd: S, args: I) -> std::process::Command
where
    I: IntoIterator<Item = S>,
    S: AsRef<std::ffi::OsStr>,
{
    let mut command = std::process::Command::new(cmd.as_ref());
    #[cfg(target_os = "windows")]
    {
        // windows平台隐藏黑窗
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command.args(args);

    command
}

pub fn run_command_output<S, I>(cmd: S, args: I) -> anyhow::Result<std::process::Output>
where
    I: IntoIterator<Item = S> + Clone,
    S: AsRef<std::ffi::OsStr>,
{
    log::info!(
        "{} {}",
        cmd.as_ref().display(),
        args.clone()
            .into_iter()
            .map(|s| s.as_ref().display().to_string())
            .collect::<Vec<_>>()
            .join(" ")
    );
    let mut command = create_command(cmd, args);
    let output = command.output()?;
    Ok(output)
}

pub fn run_command_callback<S, I, FO, FE>(
    cmd: S,
    args: I,
    mut stdout_callback: FO,
    mut stderr_callback: FE,
    current_dir: Option<&std::path::Path>,
    stdin: Option<std::process::Stdio>,
) -> anyhow::Result<std::process::Child>
where
    I: IntoIterator<Item = S> + Clone,
    S: AsRef<std::ffi::OsStr>,
    FO: FnMut(&str) + Send + 'static,
    FE: FnMut(&str) + Send + 'static,
{
    use std::io::{BufRead, BufReader};

    log::info!(
        "{} {}",
        cmd.as_ref().display(),
        args.clone()
            .into_iter()
            .map(|s| s.as_ref().display().to_string())
            .collect::<Vec<_>>()
            .join(" ")
    );
    let mut command = create_command(cmd, args);
    if let Some(current_dir) = current_dir {
        command.current_dir(current_dir);
    }
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    if let Some(stdin_config) = stdin {
        command.stdin(stdin_config);
    }

    let mut child = command.spawn()?;
    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.split(b'\n') {
                match line {
                    Ok(bytes) => match parse_bytes(&bytes) {
                        Ok(line) => stdout_callback(line.trim()),
                        Err(e) => {
                            log::error!("stdout parse error: {e}");
                        }
                    },
                    Err(e) => log::error!("stdout read error: {e}"),
                }
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.split(b'\n') {
                match line {
                    Ok(bytes) => match parse_bytes(&bytes) {
                        Ok(line) => stderr_callback(line.trim()),
                        Err(e) => {
                            log::error!("stderr parse error: {e}");
                        }
                    },
                    Err(e) => log::error!("stderr read error: {e}"),
                }
            }
        });
    }

    Ok(child)
}

pub fn stop_pid(pid: u32) -> anyhow::Result<()> {
    kill_tree::blocking::kill_tree(pid)
        .map_err(|err| anyhow::anyhow!("kill process tree failed for pid: {pid}, error: {err}"))?;

    Ok(())
}

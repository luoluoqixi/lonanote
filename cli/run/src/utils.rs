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

pub fn create_command_async<S, I>(cmd: S, args: I) -> tokio::process::Command
where
    I: IntoIterator<Item = S>,
    S: AsRef<std::ffi::OsStr>,
{
    let mut command = tokio::process::Command::new(cmd.as_ref());
    #[cfg(target_os = "windows")]
    {
        // windows平台隐藏黑窗
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

pub async fn run_command_output_async<S, I>(cmd: S, args: I) -> anyhow::Result<std::process::Output>
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
    let mut command = create_command_async(cmd, args);
    let output = command.output().await?;
    Ok(output)
}

pub fn run_command_callback<S, I, FO, FE>(
    cmd: S,
    args: I,
    mut stdout_callback: FO,
    mut stderr_callback: FE,
) -> anyhow::Result<std::process::Output>
where
    I: IntoIterator<Item = S> + Clone,
    S: AsRef<std::ffi::OsStr>,
    FO: FnMut(&str),
    FE: FnMut(&str),
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
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    let mut child = command.spawn()?;
    if let Some(stdout) = child.stdout.take() {
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
    }

    if let Some(stderr) = child.stderr.take() {
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
    }

    let output = child.wait_with_output()?;
    Ok(output)
}

pub async fn run_command_callback_async<S, I, FO, FE>(
    cmd: S,
    args: I,
    mut stdout_callback: FO,
    mut stderr_callback: FE,
    current_dir: Option<&std::path::Path>,
) -> anyhow::Result<tokio::process::Child>
where
    I: IntoIterator<Item = S> + Clone,
    S: AsRef<std::ffi::OsStr>,
    FO: FnMut(&str) + Send + 'static,
    FE: FnMut(&str) + Send + 'static,
{
    use tokio::io::{AsyncBufReadExt, BufReader};

    log::info!(
        "{} {}",
        cmd.as_ref().display(),
        args.clone()
            .into_iter()
            .map(|s| s.as_ref().display().to_string())
            .collect::<Vec<_>>()
            .join(" ")
    );
    let mut command = create_command_async(cmd, args);
    if let Some(current_dir) = current_dir {
        command.current_dir(current_dir);
    }
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());

    let mut child = command.spawn()?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    // 设置进程组
    #[cfg(unix)]
    {
        use nix::unistd::{setpgid, Pid};
        if let Some(pid) = child.id() {
            let _ = setpgid(Pid::from_raw(pid as i32), Pid::from_raw(pid as i32));
        }
    }

    let stdout_handle = tokio::spawn(async move {
        if let Some(stdout) = stdout {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                match parse_bytes(line.as_bytes()) {
                    Ok(parsed_line) => stdout_callback(parsed_line.trim()),
                    Err(e) => {
                        log::error!("stdout parse error: {e}");
                    }
                }
            }
        }
    });

    let stderr_handle = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();

            while let Ok(Some(line)) = lines.next_line().await {
                match parse_bytes(line.as_bytes()) {
                    Ok(parsed_line) => stderr_callback(parsed_line.trim()),
                    Err(e) => {
                        log::error!("stderr parse error: {e}");
                    }
                }
            }
        }
    });

    tokio::spawn(async move {
        let _ = tokio::join!(stdout_handle, stderr_handle);
    });

    Ok(child)
}

#[cfg(unix)]
pub async fn kill_process_group(child: &mut tokio::process::Child) {
    use nix::sys::signal::{killpg, Signal};
    use nix::unistd::Pid;

    if let Some(pid) = child.id() {
        let _ = killpg(Pid::from_raw(pid as i32), Signal::SIGTERM);

        // 等待进程结束
        tokio::select! {
            _ = child.wait() => {}
            _ = tokio::time::sleep(tokio::time::Duration::from_secs(3)) => {
                let _ = child.kill().await;
            }
        }
    }
}

#[cfg(windows)]
pub async fn kill_process_group(child: &mut tokio::process::Child) {
    if let Some(pid) = child.id() {
        let _ = std::process::Command::new("taskkill")
            .args(["/T", "/F", "/PID", &pid.to_string()])
            .output();

        tokio::select! {
            _ = child.wait() => {}
            _ = tokio::time::sleep(tokio::time::Duration::from_secs(3)) => {
                let _ = child.kill().await;
            }
        }
    }
}

pub async fn stop_error<const N: usize>(
    childs: [Result<tokio::process::Child, anyhow::Error>; N],
    signal: bool,
) -> Result<[tokio::process::Child; N], anyhow::Error> {
    let errors = childs
        .iter()
        .filter_map(|c| c.as_ref().err())
        .collect::<Vec<_>>();

    if !errors.is_empty() {
        Err(anyhow::anyhow!(
            "Some process failed to start: {}",
            errors
                .iter()
                .map(|e| format!("{e}"))
                .collect::<Vec<_>>()
                .join(", ")
        ))
    } else {
        let mut list = childs.into_iter().map(|c| c.unwrap()).collect::<Vec<_>>();
        if signal {
            stop_signal(list.iter_mut().collect::<Vec<_>>()).await;
        }
        Ok(list.try_into().unwrap())
    }
}

pub async fn stop_signal(childs: Vec<&mut tokio::process::Child>) {
    tokio::signal::ctrl_c().await.ok();
    println!("\nstop signal...");
    for c in childs {
        let _ = kill_process_group(c).await;
    }
    println!("stop finish");
}

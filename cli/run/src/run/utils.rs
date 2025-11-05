#![allow(dead_code)]

use std::path::PathBuf;

use colored::Colorize;
use log::{error, info};
use which::which;

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

pub fn run_command_output<S, I>(
    cmd: S,
    args: I,
    current_dir: Option<&std::path::Path>,
) -> anyhow::Result<std::process::Output>
where
    I: IntoIterator<Item = S> + Clone,
    S: AsRef<std::ffi::OsStr>,
{
    info!(
        "{}",
        current_dir
            .map(|p| format!("cd {}", p.display()))
            .unwrap_or_default()
    );
    info!(
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

    info!(
        "{}",
        current_dir
            .map(|p| format!("cd {}", p.display()))
            .unwrap_or_default()
    );
    info!(
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
                            error!("{}", format!("stdout parse error: {e}").red());
                        }
                    },
                    Err(e) => error!("{}", format!("stdout read error: {e}").red()),
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
                            error!("{}", format!("stderr parse error: {e}").red());
                        }
                    },
                    Err(e) => error!("{}", format!("stderr read error: {e}").red()),
                }
            }
        });
    }

    Ok(child)
}

pub fn run_command_which_callback<C: AsRef<str>, P: AsRef<str>, S: AsRef<str>, FO, FE>(
    command: C,
    project_path: P,
    commands: &[S],
    stdout_callback: FO,
    stderr_callback: FE,
) -> anyhow::Result<std::process::Child>
where
    FO: FnMut(&str) + Send + 'static,
    FE: FnMut(&str) + Send + 'static,
{
    match which(command.as_ref()) {
        Ok(path) => {
            let child = super::run_command_callback(
                path.to_str().unwrap(),
                commands.iter().map(|s| s.as_ref()),
                stdout_callback,
                stderr_callback,
                Some(PathBuf::from(project_path.as_ref()).as_path()),
                Some(std::process::Stdio::piped()),
            )
            .map_err(|e| {
                anyhow::anyhow!(
                    "Failed to run [{} {}]: {e}",
                    command.as_ref(),
                    commands
                        .iter()
                        .map(|s| s.as_ref())
                        .collect::<Vec<_>>()
                        .join(" ")
                )
            })?;

            Ok(child)
        }
        Err(_) => anyhow::bail!("{} not found in PATH", command.as_ref()),
    }
}

pub fn run_command_which_log<C: AsRef<str>, P: AsRef<str>, S: AsRef<str>>(
    command: C,
    project_path: P,
    commands: &[S],
) -> anyhow::Result<std::process::Child> {
    run_command_which_callback(
        command,
        project_path,
        commands,
        |stdout| {
            info!("{stdout}");
        },
        |stderr| {
            error!("{}", stderr.red());
        },
    )
}

pub fn run_command_which_println<C: AsRef<str>, P: AsRef<str>, S: AsRef<str>>(
    command: C,
    project_path: P,
    commands: &[S],
) -> anyhow::Result<std::process::Child> {
    run_command_which_callback(
        command,
        project_path,
        commands,
        |stdout| {
            println!("{stdout}");
        },
        |stderr| {
            eprintln!("{stderr}");
        },
    )
}

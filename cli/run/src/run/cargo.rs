use which::which;

use crate::config::CURRENT_PATH;

pub fn run_cargo_install<S: AsRef<str>, P: AsRef<str>>(
    project_path: S,
    package: P,
) -> anyhow::Result<()> {
    let mut child = run_cargo(project_path, &["install", package.as_ref()])?;
    child.wait()?;

    Ok(())
}

pub fn run_cargo_bin<S: AsRef<str>, P: AsRef<str>, C: AsRef<str>>(
    package: P,
    project_path: S,
    commands: &[C],
) -> anyhow::Result<std::process::Child> {
    if which(package.as_ref()).is_err() {
        run_cargo_install(CURRENT_PATH.to_str().unwrap(), package.as_ref())?;
    }
    super::run_command_which_log(package.as_ref(), project_path, commands)
}

pub fn run_cargo_version<S: AsRef<str>>(project_path: S, next_version: &str) -> anyhow::Result<()> {
    let mut child = run_cargo(project_path, &["set-version", next_version])?;
    child.wait()?;

    Ok(())
}

pub fn run_cargo<P: AsRef<str>, S: AsRef<str>>(
    project_path: P,
    commands: &[S],
) -> anyhow::Result<std::process::Child> {
    super::run_command_which_println("cargo", project_path, commands)
}

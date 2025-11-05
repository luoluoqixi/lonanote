pub fn run_dart_build_runner<S: AsRef<str>>(project_path: S) -> anyhow::Result<()> {
    let mut child = run_dart(project_path, &["run", "build_runner", "build"])?;
    child.wait()?;

    Ok(())
}

pub fn run_dart<P: AsRef<str>, S: AsRef<str>>(
    project_path: P,
    commands: &[S],
) -> anyhow::Result<std::process::Child> {
    super::run_command_which_log("dart", project_path, commands)
}

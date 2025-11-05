pub fn run_flutter_install<S: AsRef<str>>(project_path: S) -> anyhow::Result<std::process::Child> {
    let mut child = run_flutter(project_path.as_ref(), &["pub", "get"])?;
    child.wait()?;

    Ok(child)
}

pub fn run_flutter_dev<S: AsRef<str>>(project_path: S) -> anyhow::Result<std::process::Child> {
    let child = run_flutter(project_path.as_ref(), &["run"])?;

    Ok(child)
}

pub fn run_flutter_dev_release<S: AsRef<str>>(
    project_path: S,
) -> anyhow::Result<std::process::Child> {
    let child = run_flutter(project_path.as_ref(), &["run", "--release"])?;

    Ok(child)
}

pub fn run_flutter_build<S: AsRef<str>>(project_path: S, build_type: S) -> anyhow::Result<()> {
    let mut child = run_flutter(
        project_path.as_ref(),
        &["build", build_type.as_ref(), "--release"],
    )?;
    child.wait()?;

    Ok(())
}

pub fn run_flutter<S: AsRef<str>>(
    project_path: S,
    commands: &[S],
) -> anyhow::Result<std::process::Child> {
    super::run_command_which_log("flutter", project_path, commands)
}

static NPM: &str = "pnpm";

pub fn run_npm_install<S: AsRef<str>>(project_path: S) -> anyhow::Result<()> {
    let mut child = run_npm(NPM, project_path.as_ref(), &["install"])?;
    child.wait()?;

    Ok(())
}

pub fn run_npm_dev<S: AsRef<str>>(project_path: S) -> anyhow::Result<std::process::Child> {
    let child = run_npm(NPM, project_path.as_ref(), &["dev"])?;

    Ok(child)
}

pub fn run_npm_build<S: AsRef<str>>(project_path: S) -> anyhow::Result<()> {
    let mut child = run_npm(NPM, project_path.as_ref(), &["build"])?;
    child.wait()?;

    Ok(())
}

pub fn run_npm<N: AsRef<str>, P: AsRef<str>, S: AsRef<str>>(
    npm: N,
    project_path: P,
    commands: &[S],
) -> anyhow::Result<std::process::Child> {
    super::run_command_which_log(npm, project_path, commands)
}

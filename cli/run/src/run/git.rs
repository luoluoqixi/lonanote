use std::path::PathBuf;

use log::info;

pub fn run_git_push<S: AsRef<str>>(project_path: S) -> anyhow::Result<()> {
    let mut child = run_git(project_path, &["push", "origin", "HEAD", "--tags"])?;
    child.wait()?;

    Ok(())
}

pub fn run_git_add<S: AsRef<str>>(project_path: S) -> anyhow::Result<()> {
    let mut child = run_git(project_path, &["add", "."])?;
    child.wait()?;

    Ok(())
}

pub fn run_git_commit<S: AsRef<str>>(
    project_path: S,
    message: &str,
    sign: bool,
) -> anyhow::Result<()> {
    let mut child = if sign {
        run_git(project_path, &["commit", "-S", "-m", message])?
    } else {
        run_git(project_path, &["commit", "-m", &format!("\"{message}\"")])?
    };
    child.wait()?;

    Ok(())
}

pub fn run_git_delete_tag<S: AsRef<str>>(project_path: S, tag: &str) -> anyhow::Result<()> {
    let mut child = run_git(project_path, &["tag", "-d", tag])?;
    child.wait()?;

    Ok(())
}

pub fn run_git_tag<S: AsRef<str>>(
    project_path: S,
    tag: &str,
    message: Option<&str>,
) -> anyhow::Result<()> {
    let output = run_git_output(project_path.as_ref(), &["tag"])?;
    let tag_output = super::parse_bytes(&output.stdout).map_err(|err| anyhow::anyhow!("{err}"))?;
    if tag_output.contains(&tag.to_string()) {
        info!("tag {tag} is already exists, delete tag {tag}");
        run_git_delete_tag(project_path.as_ref(), tag)?;
    }
    info!("create tag {tag}");
    // git rev-parse HEAD
    let output = run_git_output(project_path.as_ref(), &["rev-parse", "HEAD"])?;
    let commit_hash = super::parse_bytes(&output.stdout)
        .map_err(|err| anyhow::anyhow!("parse git rev stdout error: {err}"))?;
    let commit_hash = commit_hash.trim();

    if commit_hash.is_empty() {
        anyhow::bail!("git rev-parse HEAD returned empty commit hash");
    }

    info!("commit hash: {commit_hash}");

    let child = if let Some(msg) = message {
        run_git(
            project_path.as_ref(),
            &["tag", "-a", tag, "-m", &format!("\"{msg}\""), commit_hash],
        )
    } else {
        run_git(project_path.as_ref(), &["tag", tag, commit_hash])
    };
    let mut child = child.map_err(|err| anyhow::anyhow!("git tag err: {err}"))?;
    child.wait()?;

    Ok(())
}

pub fn run_git<P: AsRef<str>, S: AsRef<str>>(
    project_path: P,
    commands: &[S],
) -> anyhow::Result<std::process::Child> {
    super::run_command_which_println("git", project_path, commands)
}

pub fn run_git_output<P: AsRef<str>, S: AsRef<str>>(
    project_path: P,
    commands: &[S],
) -> anyhow::Result<std::process::Output> {
    super::run_command_output(
        "git",
        commands.iter().map(|s| s.as_ref()),
        Some(&PathBuf::from(project_path.as_ref())),
    )
}

use std::path::PathBuf;

use log::{error, info};

use crate::utils;

static NPM: &str = "pnpm";

pub async fn run_npm_install<S: AsRef<str>>(project_path: S) -> anyhow::Result<()> {
    let child = run_npm(NPM, project_path.as_ref(), "install").await?;
    child.wait_with_output().await?;

    Ok(())
}

pub async fn run_npm_dev<S: AsRef<str>>(project_path: S) -> anyhow::Result<tokio::process::Child> {
    let child = run_npm(NPM, project_path.as_ref(), "dev").await?;

    Ok(child)
}

pub async fn run_npm_build<S: AsRef<str>>(project_path: S) -> anyhow::Result<()> {
    let child = run_npm(NPM, project_path.as_ref(), "build").await?;
    child.wait_with_output().await?;

    Ok(())
}

pub async fn run_npm<S: AsRef<str>>(
    npm: S,
    project_path: S,
    command: S,
) -> anyhow::Result<tokio::process::Child> {
    let child = utils::run_command_callback_async(
        format!(
            "{}{}",
            npm.as_ref(),
            if cfg!(windows) { ".cmd" } else { "" }
        )
        .as_str(),
        ["-C", project_path.as_ref(), command.as_ref()],
        |stdout| {
            info!("{stdout}");
        },
        |stderr| {
            error!("{stderr}");
        },
        None,
    )
    .await
    .map_err(|e| anyhow::anyhow!("Failed to run [pnpm {}]: {e}", command.as_ref()))?;

    Ok(child)
}

pub async fn run_flutter_dev<S: AsRef<str>>(
    project_path: S,
) -> anyhow::Result<tokio::process::Child> {
    let child = run_flutter(project_path.as_ref(), vec!["run"]).await?;

    Ok(child)
}

pub async fn run_flutter_dev_release<S: AsRef<str>>(
    project_path: S,
) -> anyhow::Result<tokio::process::Child> {
    let child = run_flutter(project_path.as_ref(), vec!["run", "--release"]).await?;

    Ok(child)
}

pub async fn run_flutter_build<S: AsRef<str>>(
    project_path: S,
    build_type: S,
) -> anyhow::Result<()> {
    let child = run_flutter(
        project_path.as_ref(),
        vec!["build", build_type.as_ref(), "--release"],
    )
    .await?;
    child.wait_with_output().await?;

    Ok(())
}

pub async fn run_flutter<S: AsRef<str>>(
    project_path: S,
    commands: Vec<S>,
) -> anyhow::Result<tokio::process::Child> {
    let child = utils::run_command_callback_async(
        format!("flutter{}", if cfg!(windows) { ".bat" } else { "" }).as_str(),
        commands.iter().map(|s| s.as_ref()),
        |stdout| {
            info!("{stdout}");
        },
        |stderr| {
            error!("{stderr}");
        },
        PathBuf::from(project_path.as_ref()).as_path().into(),
    )
    .await
    .map_err(|e| {
        anyhow::anyhow!(
            "Failed to run [flutter {}]: {e}",
            commands
                .iter()
                .map(|s| s.as_ref())
                .collect::<Vec<_>>()
                .join(",")
        )
    })?;

    Ok(child)
}

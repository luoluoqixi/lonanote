use std::{
    ffi::OsStr,
    path::{absolute, Path, PathBuf},
};

use log::info;

use crate::{
    config::{CURRENT_PATH, REPO_ROOT},
    run::{self, cargo, git, npm},
};

static COMMIT_MESSAGE: &str = "🔖 release";

fn check_convco_install() -> anyhow::Result<PathBuf> {
    match which::which("convco") {
        Ok(path) => Ok(path),
        Err(_) => {
            // install cargo-edit first
            let mut child =
                cargo::run_cargo(CURRENT_PATH.to_str().unwrap(), &["install", "cargo-edit"])?;
            child.wait()?;

            // install convco
            let mut child = cargo::run_cargo(
                CURRENT_PATH.to_str().unwrap(),
                &[
                    "install",
                    "--git",
                    "https://github.com/luoluoqixi/convco.git",
                ],
            )?;
            child.wait()?;

            which::which("convco").map_err(|e| anyhow::anyhow!("convco notfound: {e}"))
        }
    }
}

fn run_convco<S: AsRef<str>>(
    convco_path: &Path,
    config_path: &Path,
    args: &[S],
) -> anyhow::Result<std::process::Output> {
    let mut args = args
        .iter()
        .map(|s| OsStr::new(s.as_ref()))
        .collect::<Vec<_>>();
    args.push(OsStr::new("--config"));
    args.push(OsStr::new(config_path.to_str().unwrap()));
    let output = run::run_command_output(convco_path.as_os_str(), args, Some(REPO_ROOT.as_path()))?;
    Ok(output)
}

fn run_convco_output<S: AsRef<str>>(
    convco_path: &Path,
    config_path: &Path,
    args: &[S],
) -> anyhow::Result<String> {
    let output = run_convco(convco_path, config_path, args)?;
    let v = run::parse_bytes(&output.stdout).map_err(|e| anyhow::anyhow!("{e}"))?;

    Ok(v)
}

fn get_current_version(convco_path: &Path, config_path: &Path) -> anyhow::Result<String> {
    let v = run_convco_output(convco_path, config_path, &["version"])?;
    let v = v.trim();
    if !v.is_empty() {
        Ok(v.to_string())
    } else {
        Err(anyhow::anyhow!("convco version failed, output is None"))
    }
}

fn get_next_version(
    convco_path: &Path,
    config_path: &Path,
    major: bool,
    minor: bool,
    patch: bool,
) -> anyhow::Result<String> {
    let mut args = vec!["version", "--bump"];
    if major {
        args.push("--major");
    } else if minor {
        args.push("--minor");
    } else if patch {
        args.push("--patch");
    }
    let v = run_convco_output(convco_path, config_path, &args)?;
    let v = v.trim();
    if !v.is_empty() {
        Ok(v.to_string())
    } else {
        Err(anyhow::anyhow!(
            "convco version --bump failed, output is None"
        ))
    }
}

fn generate_changelog(
    repo_root: &Path,
    convco_path: &Path,
    config_path: &Path,
    changelog_file: &Path,
    next_version: &str,
) -> anyhow::Result<()> {
    info!("generate changelog...");
    let v = run_convco_output(
        convco_path,
        config_path,
        &["changelog", "--unreleased", next_version],
    )?;
    if !v.is_empty() {
        let changelog_path = repo_root.join(changelog_file);
        std::fs::write(&changelog_path, v)?;
        info!("generate changelog finish: {}", changelog_path.display());

        Ok(())
    } else {
        Err(anyhow::anyhow!("generate changelog error, output is None"))
    }
}

fn change_package_version(project_path: &Path, next_version: &str) -> anyhow::Result<()> {
    info!("change package version in {}...", project_path.display());
    npm::run_npm_version(project_path.to_str().unwrap(), next_version)?;
    info!("change package version finish: v{next_version}");
    Ok(())
}

fn change_pubspec_version(project_path: &Path, next_version: &str) -> anyhow::Result<()> {
    info!("change pubspec version in {}...", project_path.display());
    let pubspec_path = project_path.join("pubspec.yaml");
    if pubspec_path.exists() {
        let content = std::fs::read_to_string(&pubspec_path)?;
        let new_content = content
            .lines()
            .map(|line| {
                if line.starts_with("version:") {
                    format!("version: {next_version}+1")
                } else {
                    line.to_string()
                }
            })
            .collect::<Vec<_>>()
            .join("\n");
        std::fs::write(&pubspec_path, new_content)?;
    }

    info!("change pubspec version finish: v{next_version}");
    Ok(())
}

fn change_cargo_version(project_path: &Path, next_version: &str) -> anyhow::Result<()> {
    info!("change cargo version in {}...", project_path.display());
    cargo::run_cargo_version(project_path.to_str().unwrap(), next_version)?;
    info!("change cargo version finish: v{next_version}");
    Ok(())
}

fn change_version(repo_root: &Path, next_version: &str) -> anyhow::Result<()> {
    change_package_version(&repo_root.join("ui/editor"), next_version)?;
    change_pubspec_version(&repo_root.join("ui/flutter"), next_version)?;
    change_cargo_version(&repo_root.join("rust"), next_version)?;

    Ok(())
}

fn git_commit(repo_root: &Path, next_version: &str) -> anyhow::Result<()> {
    let repo_root = repo_root.to_str().unwrap();
    git::run_git_add(repo_root)?;
    git::run_git_commit(
        repo_root,
        &format!("{COMMIT_MESSAGE} v{next_version}"),
        true,
    )?;
    Ok(())
}

fn git_tag(repo_root: &Path, next_version: &str) -> anyhow::Result<()> {
    git::run_git_tag(
        repo_root.to_str().unwrap(),
        &format!("v{next_version}"),
        Some(&format!("{COMMIT_MESSAGE} v{next_version}")),
    )?;

    Ok(())
}

fn git_push(repo_root: &Path) -> anyhow::Result<()> {
    git::run_git_push(repo_root.to_str().unwrap())?;

    Ok(())
}

pub fn release(major: bool, minor: bool, patch: bool, push: bool) -> anyhow::Result<()> {
    info!("repo root: {}", REPO_ROOT.display());
    let changelog_config_path = absolute(REPO_ROOT.join("cli/build/.versionrc")).unwrap();
    info!("changelog config path: {}", changelog_config_path.display());

    let convco_path = check_convco_install()?;
    let current_version = get_current_version(&convco_path, &changelog_config_path)?;
    let next_version = get_next_version(&convco_path, &changelog_config_path, major, minor, patch)?;

    info!("current version: {current_version}");
    info!("next version: {next_version}");

    // 1. 生成 changelog
    generate_changelog(
        REPO_ROOT.as_path(),
        &convco_path,
        &changelog_config_path,
        &REPO_ROOT.join("CHANGELOG.md"),
        &next_version,
    )?;

    // 2. 修改版本号
    change_version(REPO_ROOT.as_path(), &next_version)?;

    if push {
        // 3. 提交, 添加tag, push
        git_commit(REPO_ROOT.as_path(), &next_version)?;
        git_tag(REPO_ROOT.as_path(), &next_version)?;
        git_push(REPO_ROOT.as_path())?;
    }

    info!("release all finish");

    Ok(())
}

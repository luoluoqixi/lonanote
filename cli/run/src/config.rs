use std::{
    path::{absolute, PathBuf},
    sync::LazyLock,
};

pub static CURRENT_PATH: LazyLock<PathBuf> = LazyLock::new(|| {
    absolute(
        std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap() // /release
            .parent()
            .unwrap() // /target
            .parent()
            .unwrap(),
    )
    .unwrap()
});

pub static REPO_ROOT: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(CURRENT_PATH.join("../")).unwrap());

pub static RUN_CONFIG_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(CURRENT_PATH.join("run/config/run_config.toml")).unwrap());

pub static RUN_CONFIG: LazyLock<RunConfig> = LazyLock::new(|| {
    let content = std::fs::read_to_string(RUN_CONFIG_PATH.as_path()).unwrap();
    toml::from_str(&content).unwrap()
});

#[derive(Debug, Clone, serde::Deserialize)]
pub struct RunConfig {
    pub commands: Vec<CommandConfig>,
    pub release_projects: Vec<ReleaseProject>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub enum ReleaseProjectType {
    #[serde(rename = "pubspec")]
    Pubspec,
    #[serde(rename = "cargo")]
    Cargo,
    #[serde(rename = "npm")]
    Npm,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct ReleaseProject {
    pub name: String,
    pub path: String,
    pub package_type: ReleaseProjectType,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CommandConfig {
    pub name: String,
    pub description: Option<String>,
    pub cmds: Option<Vec<Cmd>>,

    pub cmds_windows: Option<Vec<Cmd>>,
    pub cmds_macos: Option<Vec<Cmd>>,
    pub cmds_linux: Option<Vec<Cmd>>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct Cmd {
    pub cmd: String,
    pub args: Option<Vec<String>>,
    pub run_dir: Option<String>,

    pub always_run: Option<bool>,
    pub always_run_receive_input: Option<bool>,

    pub which_cargo_install: Option<bool>,
}

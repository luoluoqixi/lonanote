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

pub static UI_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(REPO_ROOT.join("ui")).unwrap());

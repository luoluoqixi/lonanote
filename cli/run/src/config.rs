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

pub static TS_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(REPO_ROOT.join("ui/ts")).unwrap());

pub static TS_NODE_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(REPO_ROOT.join("rust/node")).unwrap());

pub static FLUTTER_EDITOR_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(REPO_ROOT.join("ui/flutter/assets/editor")).unwrap());

pub static FLUTTER_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(REPO_ROOT.join("ui/flutter")).unwrap());

pub static FLUTTER_CORE_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(REPO_ROOT.join("ui/flutter/core")).unwrap());

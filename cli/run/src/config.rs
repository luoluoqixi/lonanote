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

pub static EDITOR_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(REPO_ROOT.join("ui/editor")).unwrap());

pub static FLUTTER_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(REPO_ROOT.join("ui/flutter")).unwrap());
pub static FLUTTER_RUST_BUILDER_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| absolute(FLUTTER_PROJECT_PATH.join("rust_builder")).unwrap());
pub static FLUTTER_RUST_BUILDTOOL_PROJECT_PATH: LazyLock<PathBuf> = LazyLock::new(|| {
    absolute(FLUTTER_RUST_BUILDER_PROJECT_PATH.join("cargokit/build_tool")).unwrap()
});

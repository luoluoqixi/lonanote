use std::{path::PathBuf, sync::LazyLock};

pub static CURRENT_PATH: LazyLock<PathBuf> = LazyLock::new(|| {
    std::env::current_exe()
        .unwrap()
        .parent()
        .unwrap() // /release
        .parent()
        .unwrap() // /target
        .parent()
        .unwrap() // /cli
        .to_path_buf()
});

pub static EDITOR_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| CURRENT_PATH.join("../ui/editor"));

pub static FLUTTER_PROJECT_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| CURRENT_PATH.join("../ui/flutter"));

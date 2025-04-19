use std::path::PathBuf;

use tauri_build::{try_build, Attributes, WindowsAttributes};

fn main() {
    try_build(
        Attributes::new().windows_attributes(WindowsAttributes::new().window_icon_path(
            PathBuf::from("../../ui/packages/desktop/build/icons/icon_windows.ico"),
        )),
    )
    .expect("failed to run tauri-build");
}

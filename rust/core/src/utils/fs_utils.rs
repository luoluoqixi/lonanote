use anyhow::Result;
use fs_extra::{dir::move_dir, file::move_file};
use std::path::Path;

pub fn r#move(
    src_path: impl AsRef<Path>,
    target_path: impl AsRef<Path>,
    overwrite: bool,
) -> Result<()> {
    if src_path.as_ref().exists() {
        if src_path.as_ref().is_file() {
            let mut options = fs_extra::file::CopyOptions::new();
            options.overwrite = overwrite;
            move_file(src_path, target_path, &options)?;
        } else {
            let mut options = fs_extra::dir::CopyOptions::new();
            options.overwrite = overwrite;
            options.copy_inside = true;
            move_dir(src_path, target_path, &options)?;
        }
        Ok(())
    } else {
        Err(anyhow::anyhow!(
            "src path notfound: {}",
            src_path.as_ref().display()
        ))
    }
}

pub fn copy(
    src_path: impl AsRef<Path>,
    target_path: impl AsRef<Path>,
    overwrite: bool,
) -> Result<()> {
    if src_path.as_ref().exists() {
        if src_path.as_ref().is_file() {
            let mut options = fs_extra::file::CopyOptions::new();
            options.overwrite = overwrite;
            fs_extra::file::copy(src_path, target_path, &options)?;
        } else {
            let mut options = fs_extra::dir::CopyOptions::new();
            options.overwrite = overwrite;
            options.copy_inside = true;
            fs_extra::dir::copy(src_path, target_path, &options)?;
        }
        Ok(())
    } else {
        Err(anyhow::anyhow!(
            "src path notfound: {}",
            src_path.as_ref().display()
        ))
    }
}

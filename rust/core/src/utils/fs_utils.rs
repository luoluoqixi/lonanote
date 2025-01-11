use anyhow::Result;
use fs_extra::dir::{move_dir, CopyOptions};
use std::path::Path;

pub fn move_folder(
    src_folder: impl AsRef<Path>,
    target_folder: impl AsRef<Path>,
    overwrite: bool,
) -> Result<()> {
    let mut options = CopyOptions::new();
    options.overwrite = overwrite;
    options.copy_inside = true;
    move_dir(src_folder, target_folder, &options)?;

    Ok(())
}

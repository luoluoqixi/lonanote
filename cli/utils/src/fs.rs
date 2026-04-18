use anyhow::{bail, Context, Result};
use std::path::Path;

pub fn copy(src_path: impl AsRef<Path>, target_path: impl AsRef<Path>) -> Result<()> {
    let src_path = src_path.as_ref();
    let target_path = target_path.as_ref();

    if !src_path.exists() {
        bail!("source path not found: {}", src_path.display());
    }

    if src_path.is_file() {
        copy_file(src_path, target_path)
    } else if src_path.is_dir() {
        let abs_src = src_path.canonicalize().with_context(|| {
            format!("failed to canonicalize source path: {}", src_path.display())
        })?;
        let abs_target = target_path.canonicalize().with_context(|| {
            format!(
                "failed to canonicalize target path: {}",
                target_path.display()
            )
        })?;

        if abs_target.starts_with(&abs_src) {
            bail!(
                "target path cannot be inside source directory: {}",
                target_path.display()
            );
        }
        copy_dir(src_path, target_path)
    } else {
        bail!("unsupported source path type: {}", src_path.display());
    }
}

fn copy_file(src_path: &Path, target_path: &Path) -> Result<()> {
    let final_target = target_path;

    if final_target.exists() && final_target.is_dir() {
        bail!(
            "cannot overwrite directory with file: {}",
            final_target.display()
        );
    }

    if let Some(dir) = final_target.parent() {
        std::fs::create_dir_all(dir)
            .with_context(|| format!("failed to create parent directory: {}", dir.display()))?;
    }

    std::fs::copy(src_path, final_target).with_context(|| {
        format!(
            "failed to copy file from {} to {}",
            src_path.display(),
            final_target.display()
        )
    })?;

    Ok(())
}

fn copy_dir(src_dir: &Path, target_path: &Path) -> Result<()> {
    if target_path.exists() && !target_path.is_dir() {
        bail!(
            "path type mismatch: source is directory but target is not directory: {}",
            target_path.display()
        );
    }

    for entry in std::fs::read_dir(src_dir)
        .with_context(|| format!("failed to read directory: {}", src_dir.display()))?
    {
        let entry =
            entry.with_context(|| format!("failed to read entry in: {}", src_dir.display()))?;

        let src_path = entry.path();
        let dst_path = target_path.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir(&src_path, &dst_path)?;
        } else if src_path.is_file() {
            copy_file(&src_path, &dst_path)?;
        } else {
            bail!("unsupported path in directory: {}", src_path.display());
        }
    }

    Ok(())
}

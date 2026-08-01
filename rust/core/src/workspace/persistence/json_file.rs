use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

use serde::{de::DeserializeOwned, Serialize};

#[cfg(unix)]
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

use crate::workspace::error::WorkspaceError;

type ErrorFactory = fn(String) -> WorkspaceError;

pub(crate) fn load_json_with_backup<T>(
    path: &Path,
    label: &str,
    error_factory: ErrorFactory,
    validate: fn(&mut T) -> Result<(), WorkspaceError>,
) -> Result<T, WorkspaceError>
where
    T: Default + DeserializeOwned,
{
    let backup = backup_path(path);
    restrict_existing_file_permissions(path, label, error_factory)?;
    restrict_existing_file_permissions(&backup, label, error_factory)?;
    if !path.exists() {
        if backup.exists() {
            return read_json(&backup, label, error_factory, validate);
        }
        let mut data = T::default();
        validate(&mut data)?;
        return Ok(data);
    }

    match read_json(path, label, error_factory, validate) {
        Ok(data) => Ok(data),
        Err(primary_error) => {
            read_json(&backup, label, error_factory, validate).map_err(|backup_error| {
                error_factory(format!(
                    "{label} 与 backup 均无法读取；primary: {primary_error}; backup: {backup_error}"
                ))
            })
        }
    }
}

fn restrict_existing_file_permissions(
    path: &Path,
    label: &str,
    error_factory: ErrorFactory,
) -> Result<(), WorkspaceError> {
    if path.exists() {
        restrict_file_permissions(path, label, error_factory)?;
    }
    Ok(())
}

pub(crate) fn write_json_atomically<T>(
    path: &Path,
    data: &T,
    label: &str,
    error_factory: ErrorFactory,
    validate: fn(&mut T) -> Result<(), WorkspaceError>,
) -> Result<(), WorkspaceError>
where
    T: Serialize + DeserializeOwned,
{
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| error_factory(format!("创建 {label} 目录失败: {error}")))?;
    }
    let bytes = serde_json::to_vec_pretty(data)
        .map_err(|error| error_factory(format!("序列化 {label} 失败: {error}")))?;

    if let Ok(previous) = fs::read(path) {
        let previous_is_valid = serde_json::from_slice::<T>(&previous)
            .ok()
            .is_some_and(|mut data| validate(&mut data).is_ok());
        if previous_is_valid {
            write_bytes_atomically(&backup_path(path), &previous, label, error_factory)?;
        }
    }
    write_bytes_atomically(path, &bytes, label, error_factory)
}

fn read_json<T>(
    path: &Path,
    label: &str,
    error_factory: ErrorFactory,
    validate: fn(&mut T) -> Result<(), WorkspaceError>,
) -> Result<T, WorkspaceError>
where
    T: DeserializeOwned,
{
    restrict_file_permissions(path, label, error_factory)?;
    let bytes =
        fs::read(path).map_err(|error| error_factory(format!("读取 {label} 失败: {error}")))?;
    let mut data = serde_json::from_slice::<T>(&bytes)
        .map_err(|error| error_factory(format!("解析 {label} 失败: {error}")))?;
    validate(&mut data)?;
    Ok(data)
}

#[cfg(unix)]
fn restrict_file_permissions(
    path: &Path,
    label: &str,
    error_factory: ErrorFactory,
) -> Result<(), WorkspaceError> {
    let mut permissions = fs::metadata(path)
        .map_err(|error| error_factory(format!("读取 {label} 文件权限失败: {error}")))?
        .permissions();
    if permissions.mode() & 0o777 == 0o600 {
        return Ok(());
    }
    permissions.set_mode(0o600);
    fs::set_permissions(path, permissions)
        .map_err(|error| error_factory(format!("收紧 {label} 文件权限失败: {error}")))
}

#[cfg(not(unix))]
fn restrict_file_permissions(
    _path: &Path,
    _label: &str,
    _error_factory: ErrorFactory,
) -> Result<(), WorkspaceError> {
    Ok(())
}

fn write_bytes_atomically(
    path: &Path,
    bytes: &[u8],
    label: &str,
    error_factory: ErrorFactory,
) -> Result<(), WorkspaceError> {
    let parent = path
        .parent()
        .ok_or_else(|| error_factory(format!("{label} 路径没有父目录: {}", path.display())))?;
    fs::create_dir_all(parent)
        .map_err(|error| error_factory(format!("创建 {label} 目录失败: {error}")))?;
    let temporary = parent.join(format!(
        ".{}.{}.tmp",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("workspace-data"),
        uuid::Uuid::new_v4().hyphenated()
    ));
    let result = (|| {
        let mut options = fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        options.mode(0o600);
        let mut file = options
            .open(&temporary)
            .map_err(|error| error_factory(format!("创建 {label} 临时文件失败: {error}")))?;
        file.write_all(bytes)
            .map_err(|error| error_factory(format!("写入 {label} 失败: {error}")))?;
        file.flush()
            .map_err(|error| error_factory(format!("刷新 {label} 失败: {error}")))?;
        file.sync_all()
            .map_err(|error| error_factory(format!("同步 {label} 失败: {error}")))?;
        drop(file);

        #[cfg(windows)]
        if path.exists() {
            fs::remove_file(path)
                .map_err(|error| error_factory(format!("替换 {label} 前删除失败: {error}")))?;
        }

        fs::rename(&temporary, path)
            .map_err(|error| error_factory(format!("原子替换 {label} 失败: {error}")))?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

pub(crate) fn backup_path(path: &Path) -> PathBuf {
    PathBuf::from(format!("{}.bak", path.display()))
}

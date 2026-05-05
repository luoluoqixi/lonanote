use std::{
    path::Path,
    sync::{LazyLock, RwLock},
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppPaths {
    pub data_dir: String,
    pub cache_dir: String,
    pub download_dir: String,
    pub home_dir: String,
}

impl AppPaths {
    pub fn new(
        data_dir: impl Into<String>,
        cache_dir: impl Into<String>,
        download_dir: impl Into<String>,
        home_dir: impl Into<String>,
    ) -> Self {
        Self {
            data_dir: data_dir.into(),
            cache_dir: cache_dir.into(),
            download_dir: download_dir.into(),
            home_dir: home_dir.into(),
        }
    }
}

static DEFAULT_APP_PATHS: LazyLock<RwLock<Option<AppPaths>>> = LazyLock::new(|| RwLock::new(None));

fn require_app_paths() -> AppPaths {
    DEFAULT_APP_PATHS
        .read()
        .unwrap()
        .clone()
        .expect("app paths not initialized")
}

fn parent_or_self(path: &Path) -> &Path {
    path.parent().unwrap_or(path)
}

pub fn resolve_default_paths(data_dir: impl AsRef<Path>) -> AppPaths {
    let data_dir = data_dir.as_ref();

    #[cfg(target_os = "android")]
    {
        let home_dir = parent_or_self(data_dir);
        let cache_dir = home_dir.join("cache");
        let download_dir = data_dir.to_path_buf();
        return AppPaths::new(
            data_dir.to_string_lossy().into_owned(),
            cache_dir.to_string_lossy().into_owned(),
            download_dir.to_string_lossy().into_owned(),
            home_dir.to_string_lossy().into_owned(),
        );
    }

    #[cfg(target_os = "ios")]
    {
        let home_dir = parent_or_self(parent_or_self(data_dir));
        let cache_dir = home_dir.join("Library").join("Caches");
        let download_dir = home_dir.to_path_buf();
        return AppPaths::new(
            data_dir.to_string_lossy().into_owned(),
            cache_dir.to_string_lossy().into_owned(),
            download_dir.to_string_lossy().into_owned(),
            home_dir.to_string_lossy().into_owned(),
        );
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        let home_dir = parent_or_self(data_dir);
        let cache_dir = home_dir.join("cache");
        let download_dir = home_dir.to_path_buf();
        AppPaths::new(
            data_dir.to_string_lossy().into_owned(),
            cache_dir.to_string_lossy().into_owned(),
            download_dir.to_string_lossy().into_owned(),
            home_dir.to_string_lossy().into_owned(),
        )
    }
}

pub fn get_cache_dir() -> String {
    require_app_paths().cache_dir
}

pub fn get_home_dir() -> String {
    require_app_paths().home_dir
}

pub fn get_data_dir() -> String {
    require_app_paths().data_dir
}

pub fn get_download_dir() -> String {
    require_app_paths().download_dir
}

pub fn init_paths(paths: AppPaths) {
    DEFAULT_APP_PATHS.write().unwrap().replace(paths);
}

pub fn init_dir(
    data_dir: impl AsRef<str>,
    cache_dir: impl AsRef<str>,
    download_dir: impl AsRef<str>,
    home_dir: impl AsRef<str>,
) {
    init_paths(AppPaths::new(
        data_dir.as_ref(),
        cache_dir.as_ref(),
        download_dir.as_ref(),
        home_dir.as_ref(),
    ));
}

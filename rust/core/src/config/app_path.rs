use std::sync::{Arc, LazyLock, RwLock};

static DEFAULT_CACHE_DIR: LazyLock<Arc<RwLock<Option<String>>>> =
    LazyLock::new(|| Arc::new(RwLock::new(None)));
static DEFAULT_HOME_DIR: LazyLock<Arc<RwLock<Option<String>>>> =
    LazyLock::new(|| Arc::new(RwLock::new(None)));
static DEFAULT_DATA_DIR: LazyLock<Arc<RwLock<Option<String>>>> =
    LazyLock::new(|| Arc::new(RwLock::new(None)));
static DEFAULT_DOWNLOAD_DIR: LazyLock<Arc<RwLock<Option<String>>>> =
    LazyLock::new(|| Arc::new(RwLock::new(None)));

pub fn get_cache_dir() -> String {
    DEFAULT_CACHE_DIR
        .read()
        .unwrap()
        .as_ref()
        .unwrap()
        .to_string()
}

pub fn get_home_dir() -> String {
    DEFAULT_HOME_DIR
        .read()
        .unwrap()
        .as_ref()
        .unwrap()
        .to_string()
}

pub fn get_data_dir() -> String {
    DEFAULT_DATA_DIR
        .read()
        .unwrap()
        .as_ref()
        .unwrap()
        .to_string()
}

pub fn get_download_dir() -> String {
    DEFAULT_DOWNLOAD_DIR
        .read()
        .unwrap()
        .as_ref()
        .unwrap()
        .to_string()
}

pub fn init_dir(
    data_dir: impl AsRef<str>,
    cache_dir: impl AsRef<str>,
    download_dir: impl AsRef<str>,
    home_dir: impl AsRef<str>,
) {
    DEFAULT_DATA_DIR
        .write()
        .unwrap()
        .replace(data_dir.as_ref().to_string());
    DEFAULT_CACHE_DIR
        .write()
        .unwrap()
        .replace(cache_dir.as_ref().to_string());
    DEFAULT_DOWNLOAD_DIR
        .write()
        .unwrap()
        .replace(download_dir.as_ref().to_string());
    DEFAULT_HOME_DIR
        .write()
        .unwrap()
        .replace(home_dir.as_ref().to_string());
}

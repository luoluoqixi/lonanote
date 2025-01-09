mod config;
mod settings;

use std::sync::{Arc, LazyLock};
use tokio::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

pub use settings::*;

static SETTINGS: LazyLock<Arc<RwLock<Settings>>> =
    LazyLock::new(|| Arc::new(RwLock::new(Settings::new())));

pub async fn get_settings() -> RwLockReadGuard<'static, Settings> {
    SETTINGS.read().await
}

pub async fn get_settings_mut() -> RwLockWriteGuard<'static, Settings> {
    SETTINGS.write().await
}

mod config;
mod settings;

use std::sync::{Arc, LazyLock};

pub use settings::*;
use tokio::sync::RwLock;

pub static SETTINGS: LazyLock<Arc<RwLock<Settings>>> =
    LazyLock::new(|| Arc::new(RwLock::new(Settings::new())));

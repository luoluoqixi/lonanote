pub mod error;
pub mod file_metadata;
pub mod workspace;
pub mod workspace_index;
pub mod workspace_manager;
pub mod workspace_metadata;
pub mod workspace_settings;

use std::sync::{Arc, LazyLock};
use tokio::sync::RwLock;
use workspace_manager::WorkspaceManager;

pub static WORKSPACE_MANAGER: LazyLock<Arc<RwLock<WorkspaceManager>>> =
    LazyLock::new(|| Arc::new(RwLock::new(WorkspaceManager::new())));

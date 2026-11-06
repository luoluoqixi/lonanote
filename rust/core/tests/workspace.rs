#[path = "workspace/api/mod.rs"]
mod api;
#[path = "workspace/concurrency.rs"]
mod concurrency;
#[path = "workspace/domain.rs"]
mod domain;
#[path = "workspace/files.rs"]
mod files;
#[path = "workspace/lifecycle.rs"]
mod lifecycle;
#[path = "workspace/managed_scan.rs"]
mod managed_scan;
#[path = "workspace/modified_at.rs"]
mod modified_at;
#[path = "workspace/persistence.rs"]
mod persistence;
#[path = "workspace/relocation.rs"]
mod relocation;
#[path = "workspace/resource.rs"]
mod resource;
#[path = "workspace/state.rs"]
mod state;
#[path = "workspace/storage.rs"]
mod storage;
#[path = "workspace/support/mod.rs"]
mod support;

#[path = "workspace/index.rs"]
mod index;

#[path = "workspace/desktop_storage.rs"]
mod desktop_storage;
#[path = "../../../ui/src-tauri/src/setup/window_sessions.rs"]
mod window_sessions;
#[path = "../../../ui/src-tauri/src/setup/workspace_access.rs"]
mod workspace_access;
#[path = "../../../ui/src-tauri/src/setup/workspace_storage_transaction.rs"]
mod workspace_storage_transaction;

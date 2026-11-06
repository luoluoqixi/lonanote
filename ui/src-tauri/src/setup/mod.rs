pub(crate) mod app_menu;
pub mod config_events;
pub(crate) mod file_ownership;
pub mod log;
pub mod window;
pub(crate) mod window_close;
pub(crate) mod window_geometry;
pub(crate) mod window_runtime;
pub(crate) mod window_sessions;
pub(crate) mod workspace_access;
pub(crate) mod workspace_storage_transaction;

#[cfg(desktop)]
pub(crate) mod launch_requests;
#[cfg(desktop)]
pub(crate) mod single_instance;

pub(crate) mod workspace_window_launch;

pub(crate) mod app_menu;
pub mod config_events;
pub(crate) mod document_save_paths;
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
pub(crate) mod editor_window_sessions;
pub(crate) mod editor_window;
pub(crate) mod external_file_drop;
pub(crate) mod external_file_drop_tickets;

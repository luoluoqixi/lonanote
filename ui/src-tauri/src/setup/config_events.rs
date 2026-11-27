use std::sync::OnceLock;

use tauri::{AppHandle, Emitter, Manager};

static RELAY_STARTED: OnceLock<()> = OnceLock::new();

pub fn init_config_event_relay(app: &AppHandle) {
    if RELAY_STARTED.set(()).is_err() {
        return;
    }

    let mut receiver = lonanote_core::config::config_sync::subscribe_config_changes();
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            match receiver.recv().await {
                Ok(lonanote_core::config::config_sync::ConfigChangedEvent::CommonStore(
                    snapshot,
                )) => {
                    if let Err(error) = app_handle.emit("lonanote://common-store-changed", snapshot)
                    {
                        log::error!("broadcast CommonStore snapshot failed: {error}");
                    }
                    for window in app_handle.webview_windows().into_values() {
                        if let Err(error) =
                            crate::utils::win::apply_preferred_window_background(&window)
                        {
                            log::error!("apply shared theme background failed: {error}");
                        }
                    }
                }
                Ok(lonanote_core::config::config_sync::ConfigChangedEvent::GlobalSettings(
                    snapshot,
                )) => {
                    if let Err(error) =
                        app_handle.emit("lonanote://global-settings-changed", snapshot)
                    {
                        log::error!("broadcast GlobalSettings snapshot failed: {error}");
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(skipped)) => {
                    log::warn!("configuration event relay lagged and skipped {skipped} events");
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                    log::error!("configuration event relay closed");
                    break;
                }
            }
        }
    });
}

#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use anyhow::Result;

pub mod utils;

pub fn init_plugins(app: &tauri::App) -> Result<()> {
    log::info!("init plugins...");
    let handle = app.handle();
    handle.plugin(utils::init_plugin()?)?;
    log::info!("init plugins finish!");
    Ok(())
}

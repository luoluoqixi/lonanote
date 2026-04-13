#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]

use anyhow::Result;
use log::info;

pub mod path;
pub mod store;
pub mod utils;

pub fn init_plugins(app: &tauri::App) -> Result<()> {
    info!("init plugins...");
    let handle = app.handle();
    handle.plugin(path::init_plugin(app)?)?;
    handle.plugin(store::init_plugin()?)?;
    handle.plugin(utils::init_plugin()?)?;
    info!("init plugins finish!");
    Ok(())
}

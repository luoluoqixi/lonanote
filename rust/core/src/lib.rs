mod api;
pub mod config;
pub(crate) mod settings;
pub mod utils;
pub(crate) mod workspace;

use anyhow::Result;
use log::info;
pub use lonanote_commands::*;

pub fn init() -> Result<()> {
    info!("init...");
    api::reg_commands()?;
    info!("init finish!");
    Ok(())
}

pub fn init_log() -> Result<()> {
    utils::init_logger()?;
    Ok(())
}

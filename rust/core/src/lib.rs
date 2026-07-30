pub mod api;
pub mod config;
pub(crate) mod settings;
pub mod utils;
pub(crate) mod workspace;

use anyhow::Result;
pub use cmdreg::*;
use log::info;

pub fn init() -> Result<()> {
    info!("init...");
    cmdreg::reg_all_commands()?;
    info!("init finish!");
    Ok(())
}

pub fn init_log() -> Result<()> {
    utils::init_logger()?;
    Ok(())
}

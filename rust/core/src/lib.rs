mod api;

use anyhow::Result;
use log::info;
pub use lonanote_commands::*;

pub fn init() -> Result<()> {
    info!("init...");
    api::reg_commands()?;
    info!("init finish!");
    Ok(())
}

use cmdreg::{command, CommandResponse, CommandResult};

#[command("app")]
fn get_version() -> CommandResult {
    let version = env!("CARGO_PKG_VERSION");
    CommandResponse::json(version)
}

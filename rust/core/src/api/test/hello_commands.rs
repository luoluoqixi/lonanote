use anyhow::Result;

use lonanote_commands::{
    body::Json,
    invoke_command_callback_lazy, reg_command, reg_command_async,
    result::{CommandResponse, CommandResult},
};

pub fn hello_command(Json(args): Json<Vec<String>>) -> CommandResult {
    println!("[hello_command]");

    CommandResponse::json(args.clone())
}

pub async fn hello_command_async(Json(args): Json<Vec<String>>) -> CommandResult {
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    println!("[hello_command]");

    CommandResponse::json(args.clone())
}

pub async fn hello_rust_call_callback() -> CommandResult {
    let ret: Option<String> =
        invoke_command_callback_lazy("rust_call_callback_key", Some("rust args".to_string()))
            .await?;
    println!("hello_rust_call_callback: {ret:?}");

    Ok(CommandResponse::None)
}

pub fn reg_hello_commands() -> Result<()> {
    reg_command("hello_command", hello_command)?;
    reg_command_async("hello_command_async", hello_command_async)?;
    reg_command_async("hello_rust_call_callback", hello_rust_call_callback)?;

    Ok(())
}

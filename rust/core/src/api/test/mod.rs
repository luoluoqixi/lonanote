use cmdreg::{command, invoke_command_callback_lazy, CommandResponse, CommandResult, Json};

#[command]
pub fn hello_command(Json(args): Json<Vec<String>>) -> CommandResult {
    println!("[hello_command]");

    CommandResponse::json(args.clone())
}

#[command]
pub async fn hello_command_async(Json(args): Json<Vec<String>>) -> CommandResult {
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    println!("[hello_command]");

    CommandResponse::json(args.clone())
}

#[command]
pub async fn hello_rust_call_callback() -> CommandResult {
    let ret: Option<String> =
        invoke_command_callback_lazy("rust_call_callback_key", Some("rust args".to_string()))
            .await?;
    println!("hello_rust_call_callback: {ret:?}");

    Ok(CommandResponse::None)
}

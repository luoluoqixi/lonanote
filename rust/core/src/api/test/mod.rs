use anyhow::Result;
use cmdreg::{command, invoke_command_callback_lazy};

#[command]
pub fn hello_command(args: Vec<String>) -> Vec<String> {
    println!("[hello_command]");
    args
}

#[command]
pub async fn hello_command_async(args: Vec<String>) -> Vec<String> {
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    println!("[hello_command]");

    args
}

#[command]
pub async fn hello_rust_call_callback() -> Result<()> {
    let ret: Option<String> =
        invoke_command_callback_lazy("rust_call_callback_key", Some("rust args".to_string()))
            .await?;
    println!("hello_rust_call_callback: {ret:?}");

    Ok(())
}

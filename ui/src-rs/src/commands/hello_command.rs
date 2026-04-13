use tauri::{
    command,
    ipc::{InvokeBody, Request},
    Builder, Runtime,
};

#[command]
pub fn hello_command_json(args: Vec<String>) -> Vec<String> {
    println!("[hello_command_json]");
    args
}

#[command]
pub fn hello_command_raw(request: Request<'_>) -> Result<Vec<u8>, String> {
    println!("[hello_command_raw]");
    if let InvokeBody::Raw(data) = request.body() {
        Ok(data.clone())
    } else {
        Err("InvokeBody::Raw parse error".to_string())
    }
}

#[command]
pub fn hello_command_void() {
    println!("[hello_command_void]");
}

#[command]
pub async fn hello_command_json_async(args: Vec<String>) -> Vec<String> {
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    println!("[hello_command_json_async]");
    args
}

#[command]
pub async fn hello_command_raw_async(request: Request<'_>) -> Result<Vec<u8>, String> {
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    println!("[hello_command_raw_async]");
    if let InvokeBody::Raw(data) = request.body() {
        Ok(data.clone())
    } else {
        Err("InvokeBody::Raw parse error".to_string())
    }
}

#[command]
pub async fn hello_command_void_async() {
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    println!("[hello_command_void_async]");
}

pub fn reg_commands<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder.invoke_handler(tauri::generate_handler![
        hello_command_json,
        hello_command_raw,
        hello_command_void,
        hello_command_json_async,
        hello_command_raw_async,
        hello_command_void_async
    ])
}

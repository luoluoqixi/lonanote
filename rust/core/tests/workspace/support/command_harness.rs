use lonanote_core::{invoke_command_async, CommandContext};
use serde::de::DeserializeOwned;

pub async fn invoke_json<T: DeserializeOwned>(key: &str, args: serde_json::Value) -> T {
    let response = invoke_command_async(key, CommandContext::Value(&args))
        .await
        .unwrap_or_else(|error| panic!("调用命令 {key} 失败: {error}"));
    let json = response
        .into_option()
        .unwrap_or_else(|| panic!("命令 {key} 应返回 JSON"));
    serde_json::from_str(&json)
        .unwrap_or_else(|error| panic!("命令 {key} 的响应无法反序列化: {error}; response={json}"))
}

pub async fn invoke_unit(key: &str, args: serde_json::Value) {
    let response = invoke_command_async(key, CommandContext::Value(&args))
        .await
        .unwrap_or_else(|error| panic!("调用命令 {key} 失败: {error}"));
    assert!(
        matches!(response.into_option().as_deref(), None | Some("null")),
        "命令 {key} 应返回空响应"
    );
}

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const WORKSPACE_STATE_SCHEMA_VERSION: u32 = 1;
pub const WORKSPACE_STATE_PATH: &str = ".lonanote/state.json";

/// 可随工作区同步的业务状态；不包含最近打开等设备本地信息。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceState {
    pub schema_version: u32,
    pub modified_at: Option<u64>,
    /// 保留同版本的未知字段，避免旧客户端保存时丢失扩展状态。
    #[serde(flatten)]
    pub extra: BTreeMap<String, Value>,
}

impl Default for WorkspaceState {
    fn default() -> Self {
        Self {
            schema_version: WORKSPACE_STATE_SCHEMA_VERSION,
            modified_at: None,
            extra: BTreeMap::new(),
        }
    }
}

/// 保存异常独立于内容保存结果，由调用方查询、展示和重试。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStateStatus {
    pub state: WorkspaceState,
    pub save_pending: bool,
    pub last_save_error: Option<String>,
}

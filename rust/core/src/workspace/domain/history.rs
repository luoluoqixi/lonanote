use serde::{Deserialize, Serialize};

use super::WorkspaceRelativePath;

/// Workspace 历史快照的持久化 schema 版本。
pub const WORKSPACE_HISTORY_SCHEMA_VERSION: u32 = 1;
/// 历史快照只属于当前设备缓存，不参与 Workspace 同步。
pub const WORKSPACE_HISTORY_ROOT: &str = ".lonanote/cache/history";

/// 历史快照列表项，不直接把正文通过列表命令返回。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceHistorySnapshot {
    pub id: String,
    pub path: WorkspaceRelativePath,
    pub created_at: u64,
    pub size: u64,
}

/// 第一版 JSON 快照的兼容读取结构。新快照直接保存正文，不使用该结构写入。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WorkspaceHistoryRecord {
    pub schema_version: u32,
    pub id: String,
    pub path: WorkspaceRelativePath,
    pub created_at: u64,
    #[serde(default)]
    pub created_at_nanos: u64,
    pub content: String,
}

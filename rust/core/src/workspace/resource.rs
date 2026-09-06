use std::{collections::HashMap, sync::Arc};

use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use super::{
    StorageByteRange, StorageEntryKind, StorageEntryMetadata, StorageError, StorageReadOptions,
    StorageReadStream, WorkspaceId, WorkspaceRelativePath, WorkspaceStorageSession,
};

const RESOURCE_CACHE_CONTROL: &str = "private, max-age=300";

/// Native adapter 在验证 opaque scope 后交给 Provider 的读取请求。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkspaceResourceRequest {
    pub workspace_id: WorkspaceId,
    pub path: WorkspaceRelativePath,
    pub range: Option<StorageByteRange>,
    pub if_none_match: Option<String>,
}

/// Native adapter 从资源 URL 解析出的请求。scope 不是 Workspace ID。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkspaceResourceScopeRequest {
    pub scope_id: String,
    pub generation: u64,
    pub path: WorkspaceRelativePath,
    pub range: Option<StorageByteRange>,
    pub if_none_match: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceResourceScope {
    pub scope_id: String,
    pub generation: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkspaceResourceStatus {
    Ok,
    PartialContent,
    NotModified,
    BadRequest,
    Forbidden,
    NotFound,
    RangeNotSatisfiable,
    InternalServerError,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkspaceResourceHeaders {
    pub content_type: String,
    pub content_length: u64,
    pub total_length: u64,
    pub content_range: Option<StorageByteRange>,
    pub etag: String,
    pub modified_at: Option<u64>,
    pub cache_control: &'static str,
}

pub struct WorkspaceResourceContent {
    pub status: WorkspaceResourceStatus,
    pub headers: WorkspaceResourceHeaders,
    pub body: StorageReadStream,
}

pub enum WorkspaceResourceResponse {
    Content(WorkspaceResourceContent),
    NotModified {
        headers: WorkspaceResourceHeaders,
    },
    Error {
        status: WorkspaceResourceStatus,
        total_length: Option<u64>,
    },
}

struct WorkspaceResourceScopeEntry {
    workspace_id: WorkspaceId,
    session: Arc<WorkspaceStorageSession>,
    generation: u64,
}

#[derive(Default)]
struct WorkspaceResourceGatewayState {
    scopes: HashMap<String, WorkspaceResourceScopeEntry>,
    scope_by_workspace: HashMap<WorkspaceId, String>,
}

/// Workspace 生命周期绑定的只读资源入口。
#[derive(Default)]
pub struct WorkspaceResourceGateway {
    state: RwLock<WorkspaceResourceGatewayState>,
}

impl WorkspaceResourceGateway {
    pub async fn acquire_scope(
        &self,
        workspace_id: WorkspaceId,
        session: Arc<WorkspaceStorageSession>,
    ) -> WorkspaceResourceScope {
        let mut state = self.state.write().await;
        if let Some(scope_id) = state.scope_by_workspace.get(&workspace_id) {
            let entry = state
                .scopes
                .get(scope_id)
                .expect("Workspace Resource scope 索引必须一致");
            return WorkspaceResourceScope {
                scope_id: scope_id.clone(),
                generation: entry.generation,
            };
        }

        let scope_id = uuid::Uuid::new_v4().hyphenated().to_string();
        let generation = 1;
        state
            .scope_by_workspace
            .insert(workspace_id, scope_id.clone());
        state.scopes.insert(
            scope_id.clone(),
            WorkspaceResourceScopeEntry {
                workspace_id,
                session,
                generation,
            },
        );
        WorkspaceResourceScope {
            scope_id,
            generation,
        }
    }

    pub async fn invalidate_workspace(&self, workspace_id: &WorkspaceId) {
        let mut state = self.state.write().await;
        let Some(scope_id) = state.scope_by_workspace.get(workspace_id).cloned() else {
            return;
        };
        let entry = state
            .scopes
            .get_mut(&scope_id)
            .expect("Workspace Resource scope 索引必须一致");
        entry.generation = entry.generation.checked_add(1).unwrap_or(1);
    }

    pub async fn revoke_workspace(&self, workspace_id: &WorkspaceId) {
        let mut state = self.state.write().await;
        let Some(scope_id) = state.scope_by_workspace.remove(workspace_id) else {
            return;
        };
        state.scopes.remove(&scope_id);
    }

    pub async fn open(&self, request: WorkspaceResourceScopeRequest) -> WorkspaceResourceResponse {
        let entry = {
            let state = self.state.read().await;
            let Some(entry) = state.scopes.get(&request.scope_id) else {
                return resource_error(WorkspaceResourceStatus::Forbidden, None);
            };
            if entry.generation != request.generation {
                return resource_error(WorkspaceResourceStatus::Forbidden, None);
            }
            (entry.workspace_id, Arc::clone(&entry.session))
        };
        open_workspace_resource(
            entry.1,
            WorkspaceResourceRequest {
                workspace_id: entry.0,
                path: request.path,
                range: request.range,
                if_none_match: request.if_none_match,
            },
        )
        .await
    }
}

async fn open_workspace_resource(
    session: Arc<WorkspaceStorageSession>,
    request: WorkspaceResourceRequest,
) -> WorkspaceResourceResponse {
    let metadata = match session.metadata(&request.path).await {
        Ok(metadata) if metadata.kind == StorageEntryKind::File => metadata,
        Ok(_) => return resource_error(WorkspaceResourceStatus::NotFound, None),
        Err(error) => return map_storage_error(error),
    };
    let headers = match resource_headers(&request.path, &metadata, None) {
        Some(headers) => headers,
        None => return resource_error(WorkspaceResourceStatus::InternalServerError, None),
    };
    if request.if_none_match.as_deref() == Some(headers.etag.as_str()) {
        return WorkspaceResourceResponse::NotModified { headers };
    }

    let stream = match session
        .open_read(
            &request.path,
            StorageReadOptions {
                range: request.range,
            },
        )
        .await
    {
        Ok(stream) => stream,
        Err(error) => return map_storage_error(error),
    };
    let headers = match resource_headers(&request.path, &stream.metadata, stream.resolved_range) {
        Some(headers) => headers,
        None => return resource_error(WorkspaceResourceStatus::InternalServerError, None),
    };
    WorkspaceResourceResponse::Content(WorkspaceResourceContent {
        status: if headers.content_range.is_some() {
            WorkspaceResourceStatus::PartialContent
        } else {
            WorkspaceResourceStatus::Ok
        },
        headers,
        body: stream,
    })
}

fn resource_headers(
    path: &WorkspaceRelativePath,
    metadata: &StorageEntryMetadata,
    content_range: Option<StorageByteRange>,
) -> Option<WorkspaceResourceHeaders> {
    let total_length = metadata.size?;
    let content_length = content_range
        .map(|range| range.end_inclusive - range.start + 1)
        .unwrap_or(total_length);
    Some(WorkspaceResourceHeaders {
        content_type: guess_content_type(path).to_owned(),
        content_length,
        total_length,
        content_range,
        etag: resource_etag(metadata),
        modified_at: metadata.modified_at,
        cache_control: RESOURCE_CACHE_CONTROL,
    })
}

fn resource_etag(metadata: &StorageEntryMetadata) -> String {
    format!(
        "W/\"{}-{}\"",
        metadata.size.unwrap_or_default(),
        metadata.modified_at.unwrap_or_default()
    )
}

fn guess_content_type(path: &WorkspaceRelativePath) -> &'static str {
    match path
        .as_str()
        .rsplit_once('.')
        .map(|(_, extension)| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("avif") => "image/avif",
        Some("gif") => "image/gif",
        Some("jpeg") | Some("jpg") => "image/jpeg",
        Some("png") => "image/png",
        Some("svg") => "image/svg+xml",
        Some("webp") => "image/webp",
        Some("mp3") => "audio/mpeg",
        Some("ogg") => "audio/ogg",
        Some("wav") => "audio/wav",
        Some("mp4") => "video/mp4",
        Some("webm") => "video/webm",
        Some("pdf") => "application/pdf",
        Some("json") => "application/json; charset=utf-8",
        Some("md") | Some("markdown") => "text/markdown; charset=utf-8",
        Some("txt") => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

fn map_storage_error(error: StorageError) -> WorkspaceResourceResponse {
    match error {
        StorageError::NotFound { .. }
        | StorageError::IsDirectory { .. }
        | StorageError::NotDirectory { .. } => {
            resource_error(WorkspaceResourceStatus::NotFound, None)
        }
        StorageError::InvalidByteRange { .. } => {
            resource_error(WorkspaceResourceStatus::BadRequest, None)
        }
        StorageError::RangeNotSatisfiable { total_length, .. } => resource_error(
            WorkspaceResourceStatus::RangeNotSatisfiable,
            Some(total_length),
        ),
        _ => resource_error(WorkspaceResourceStatus::InternalServerError, None),
    }
}

fn resource_error(
    status: WorkspaceResourceStatus,
    total_length: Option<u64>,
) -> WorkspaceResourceResponse {
    WorkspaceResourceResponse::Error {
        status,
        total_length,
    }
}

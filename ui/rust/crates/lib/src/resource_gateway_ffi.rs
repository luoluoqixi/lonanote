use std::{
    collections::HashMap,
    ffi::{c_char, c_int, CStr, CString},
    ptr,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex, OnceLock,
    },
};

use futures::StreamExt;
use lonanote_core::workspace::{
    workspace_manager, StorageByteRange, StorageReadStream, WorkspaceId, WorkspaceRelativePath,
    WorkspaceResourceHeaders, WorkspaceResourceResponse, WorkspaceResourceScopeRequest,
    WorkspaceResourceStatus,
};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex as AsyncMutex;

use super::lonanote_rust_module_impl::{ensure_init, runtime};

const READ_NEXT_CHUNK: c_int = 1;
const READ_NEXT_END: c_int = 0;
const READ_NEXT_ERROR: c_int = -1;
const READ_NEXT_UNKNOWN_HANDLE: c_int = -2;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NativeResourceOpenRequest {
    scope_id: String,
    generation: u64,
    path: String,
    range: Option<StorageByteRange>,
    if_none_match: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeResourceScopeResponse {
    scope_id: String,
    generation: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeResourceOpenResponse {
    status: u16,
    handle_id: Option<u64>,
    headers: Option<NativeResourceHeaders>,
    total_length: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeResourceHeaders {
    content_type: String,
    content_length: u64,
    total_length: u64,
    content_range: Option<StorageByteRange>,
    etag: String,
    modified_at: Option<u64>,
    cache_control: String,
}

struct NativeResourceReadHandle {
    stream: StorageReadStream,
}

static NEXT_HANDLE_ID: AtomicU64 = AtomicU64::new(1);
static RESOURCE_HANDLES: OnceLock<Mutex<HashMap<u64, Arc<AsyncMutex<NativeResourceReadHandle>>>>> =
    OnceLock::new();

fn resource_handles() -> &'static Mutex<HashMap<u64, Arc<AsyncMutex<NativeResourceReadHandle>>>> {
    RESOURCE_HANDLES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn next_handle_id() -> u64 {
    NEXT_HANDLE_ID.fetch_add(1, Ordering::Relaxed)
}

fn status_code(status: WorkspaceResourceStatus) -> u16 {
    match status {
        WorkspaceResourceStatus::Ok => 200,
        WorkspaceResourceStatus::PartialContent => 206,
        WorkspaceResourceStatus::NotModified => 304,
        WorkspaceResourceStatus::BadRequest => 400,
        WorkspaceResourceStatus::Forbidden => 403,
        WorkspaceResourceStatus::NotFound => 404,
        WorkspaceResourceStatus::RangeNotSatisfiable => 416,
        WorkspaceResourceStatus::InternalServerError => 500,
    }
}

fn serialize_headers(headers: WorkspaceResourceHeaders) -> NativeResourceHeaders {
    NativeResourceHeaders {
        content_type: headers.content_type,
        content_length: headers.content_length,
        total_length: headers.total_length,
        content_range: headers.content_range,
        etag: headers.etag,
        modified_at: headers.modified_at,
        cache_control: headers.cache_control.to_string(),
    }
}

fn serialize_response(response: NativeResourceOpenResponse) -> *mut c_char {
    let serialized = serde_json::to_string(&response).unwrap_or_else(|_| {
        "{\"status\":500,\"handleId\":null,\"headers\":null,\"totalLength\":null}".to_string()
    });
    CString::new(serialized)
        .expect("Resource response JSON 不包含 NUL")
        .into_raw()
}

fn error_response(status: WorkspaceResourceStatus) -> *mut c_char {
    serialize_response(NativeResourceOpenResponse {
        status: status_code(status),
        handle_id: None,
        headers: None,
        total_length: None,
    })
}

fn serialize_scope_response(response: NativeResourceScopeResponse) -> *mut c_char {
    let serialized = serde_json::to_string(&response).unwrap_or_else(|_| "{}".to_string());
    CString::new(serialized)
        .expect("Resource scope JSON 不包含 NUL")
        .into_raw()
}

fn parse_workspace_id(workspace_id: *const c_char) -> Result<WorkspaceId, ()> {
    if workspace_id.is_null() {
        return Err(());
    }
    let workspace_id = unsafe { CStr::from_ptr(workspace_id) }
        .to_str()
        .map_err(|_| ())?;
    WorkspaceId::parse(workspace_id).map_err(|_| ())
}

fn parse_open_request(request_json: *const c_char) -> Result<NativeResourceOpenRequest, ()> {
    if request_json.is_null() {
        return Err(());
    }
    let request_json = unsafe { CStr::from_ptr(request_json) }
        .to_str()
        .map_err(|_| ())?;
    serde_json::from_str(request_json).map_err(|_| ())
}

fn open_resource(request: NativeResourceOpenRequest) -> Result<NativeResourceOpenResponse, ()> {
    ensure_init().map_err(|_| ())?;
    let path = WorkspaceRelativePath::parse(request.path).map_err(|_| ())?;
    let response = runtime()
        .map_err(|_| ())?
        .block_on(
            workspace_manager().open_resource(WorkspaceResourceScopeRequest {
                scope_id: request.scope_id,
                generation: request.generation,
                path,
                range: request.range,
                if_none_match: request.if_none_match,
            }),
        );

    match response {
        WorkspaceResourceResponse::Content(content) => {
            let handle_id = next_handle_id();
            let handle = Arc::new(AsyncMutex::new(NativeResourceReadHandle {
                stream: content.body,
            }));
            resource_handles()
                .lock()
                .map_err(|_| ())?
                .insert(handle_id, handle);
            Ok(NativeResourceOpenResponse {
                status: status_code(content.status),
                handle_id: Some(handle_id),
                headers: Some(serialize_headers(content.headers)),
                total_length: None,
            })
        }
        WorkspaceResourceResponse::NotModified { headers } => Ok(NativeResourceOpenResponse {
            status: 304,
            handle_id: None,
            headers: Some(serialize_headers(headers)),
            total_length: None,
        }),
        WorkspaceResourceResponse::Error {
            status,
            total_length,
        } => Ok(NativeResourceOpenResponse {
            status: status_code(status),
            handle_id: None,
            headers: None,
            total_length,
        }),
    }
}

fn acquire_resource_scope(workspace_id: WorkspaceId) -> Result<NativeResourceScopeResponse, ()> {
    ensure_init().map_err(|_| ())?;
    let scope = runtime()
        .map_err(|_| ())?
        .block_on(workspace_manager().acquire_resource_scope(&workspace_id))
        .map_err(|_| ())?;
    Ok(NativeResourceScopeResponse {
        scope_id: scope.scope_id,
        generation: scope.generation,
    })
}

async fn read_next_chunk(
    handle: Arc<AsyncMutex<NativeResourceReadHandle>>,
) -> Result<Option<Vec<u8>>, ()> {
    let mut handle = handle.lock().await;
    loop {
        match handle.stream.body.next().await {
            Some(Ok(chunk)) if !chunk.is_empty() => return Ok(Some(chunk)),
            Some(Ok(_)) => continue,
            Some(Err(_)) => return Err(()),
            None => return Ok(None),
        }
    }
}

/// Native adapter 专用 scope 入口。仅返回可撤销 capability，不经常规 TypeScript command 暴露。
#[no_mangle]
pub extern "C" fn lonanote_resource_acquire_scope(workspace_id: *const c_char) -> *mut c_char {
    let Ok(workspace_id) = parse_workspace_id(workspace_id) else {
        return ptr::null_mut();
    };
    match acquire_resource_scope(workspace_id) {
        Ok(response) => serialize_scope_response(response),
        Err(()) => ptr::null_mut(),
    }
}

/// Native adapter 专用资源入口。返回 JSON metadata，正文只能通过 read_next 获取。
#[no_mangle]
pub extern "C" fn lonanote_resource_open(request_json: *const c_char) -> *mut c_char {
    let Ok(request) = parse_open_request(request_json) else {
        return error_response(WorkspaceResourceStatus::BadRequest);
    };
    match open_resource(request) {
        Ok(response) => serialize_response(response),
        Err(()) => error_response(WorkspaceResourceStatus::InternalServerError),
    }
}

/// 读取下一块字节。调用方必须使用 lonanote_resource_free_bytes 释放成功返回的缓冲区。
#[no_mangle]
pub extern "C" fn lonanote_resource_read_next(
    handle_id: u64,
    out_bytes: *mut *mut u8,
    out_length: *mut usize,
) -> c_int {
    if out_bytes.is_null() || out_length.is_null() {
        return READ_NEXT_ERROR;
    }
    unsafe {
        *out_bytes = ptr::null_mut();
        *out_length = 0;
    }

    let handle = match resource_handles().lock() {
        Ok(handles) => handles.get(&handle_id).cloned(),
        Err(_) => return READ_NEXT_ERROR,
    };
    let Some(handle) = handle else {
        return READ_NEXT_UNKNOWN_HANDLE;
    };

    match runtime().and_then(|runtime| {
        runtime
            .block_on(read_next_chunk(handle))
            .map_err(|_| anyhow::anyhow!("读取资源 chunk 失败"))
    }) {
        Ok(Some(chunk)) => {
            let length = chunk.len();
            let bytes = Box::into_raw(chunk.into_boxed_slice()) as *mut u8;
            unsafe {
                *out_bytes = bytes;
                *out_length = length;
            }
            READ_NEXT_CHUNK
        }
        Ok(None) => READ_NEXT_END,
        Err(_) => READ_NEXT_ERROR,
    }
}

/// 取消后续读取并释放 Rust stream。正在执行的单次读取会在结束后释放最后一个引用。
#[no_mangle]
pub extern "C" fn lonanote_resource_close(handle_id: u64) {
    if let Ok(mut handles) = resource_handles().lock() {
        handles.remove(&handle_id);
    }
}

#[no_mangle]
pub unsafe extern "C" fn lonanote_resource_free_string(value: *mut c_char) {
    if !value.is_null() {
        drop(CString::from_raw(value));
    }
}

#[no_mangle]
pub unsafe extern "C" fn lonanote_resource_free_bytes(bytes: *mut u8, length: usize) {
    if !bytes.is_null() {
        drop(Box::from_raw(ptr::slice_from_raw_parts_mut(bytes, length)));
    }
}

#[cfg(test)]
mod tests {
    use futures::stream;

    use super::{
        parse_workspace_id, read_next_chunk, serialize_scope_response, AsyncMutex,
        NativeResourceReadHandle, NativeResourceScopeResponse, StorageReadStream,
    };
    use lonanote_core::workspace::{StorageEntryKind, StorageEntryMetadata};
    use std::{ffi::CString, sync::Arc};

    fn stream_handle(chunks: Vec<Vec<u8>>) -> Arc<AsyncMutex<NativeResourceReadHandle>> {
        Arc::new(AsyncMutex::new(NativeResourceReadHandle {
            stream: StorageReadStream {
                metadata: StorageEntryMetadata {
                    kind: StorageEntryKind::File,
                    size: None,
                    created_at: None,
                    modified_at: None,
                },
                resolved_range: None,
                body: Box::pin(stream::iter(chunks.into_iter().map(Ok))),
            },
        }))
    }

    #[tokio::test]
    async fn reads_stream_chunks_without_combining_the_full_resource() {
        let handle = stream_handle(vec![vec![], vec![1, 2], vec![3]]);
        assert_eq!(
            read_next_chunk(Arc::clone(&handle)).await.unwrap(),
            Some(vec![1, 2])
        );
        assert_eq!(
            read_next_chunk(Arc::clone(&handle)).await.unwrap(),
            Some(vec![3])
        );
        assert_eq!(read_next_chunk(handle).await.unwrap(), None);
    }

    #[test]
    fn parses_canonical_workspace_id_and_serializes_scope_metadata() {
        let workspace_id = CString::new("605bbdf2-5a20-4c45-863d-4e24b15fbd96").unwrap();
        assert_eq!(
            parse_workspace_id(workspace_id.as_ptr())
                .unwrap()
                .to_string(),
            "605bbdf2-5a20-4c45-863d-4e24b15fbd96"
        );

        let response = serialize_scope_response(NativeResourceScopeResponse {
            scope_id: "adf2d05e-5fbb-43f8-9a65-fb18d4b6b625".to_string(),
            generation: 3,
        });
        let value = unsafe { CString::from_raw(response) }
            .into_string()
            .unwrap();
        assert_eq!(
            value,
            r#"{"scopeId":"adf2d05e-5fbb-43f8-9a65-fb18d4b6b625","generation":3}"#
        );
    }
}

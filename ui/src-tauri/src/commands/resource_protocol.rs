use futures::StreamExt;
use lonanote_core::workspace::{
    workspace_manager, StorageByteRange, StorageReadStream, WorkspaceRelativePath,
    WorkspaceResourceHeaders, WorkspaceResourceResponse, WorkspaceResourceScopeRequest,
    WorkspaceResourceStatus,
};
use tauri::{
    http::{
        header::{
            ACCEPT_RANGES, CACHE_CONTROL, CONTENT_LENGTH, CONTENT_RANGE, CONTENT_TYPE, ETAG,
            IF_NONE_MATCH, RANGE,
        },
        HeaderValue, Request, Response, StatusCode,
    },
    Builder, Runtime,
};

pub const RESOURCE_SCHEME: &str = "lonanote-resource";
const RESOURCE_HOST: &str = "resource";
const WINDOWS_RESOURCE_HOST: &str = "lonanote-resource.localhost";
// Tauri URI protocol responder 要求完整响应体，限制单次 Range 以约束原生侧缓冲。
const MAX_RESOURCE_RANGE_BYTES: u64 = 1024 * 1024;

/// 注册桌面 WebView 的受限资源协议。资源内容不进入 Tauri IPC 或前端 JavaScript。
pub fn register_resource_protocol<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder.register_asynchronous_uri_scheme_protocol(
        RESOURCE_SCHEME,
        |_context, request, responder| {
            tauri::async_runtime::spawn(async move {
                responder.respond(handle_resource_request(request).await);
            });
        },
    )
}

async fn handle_resource_request(request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let request = match parse_resource_request(&request) {
        Ok(request) => request,
        Err(status) => return empty_error_response(status, None),
    };

    match workspace_manager().open_resource(request).await {
        WorkspaceResourceResponse::Content(content) => {
            let headers = content.headers;
            match read_body(content.body).await {
                Ok(body) => response_with_headers(status_code(content.status), &headers, body),
                Err(()) => empty_error_response(WorkspaceResourceStatus::InternalServerError, None),
            }
        }
        WorkspaceResourceResponse::NotModified { headers } => {
            response_with_headers(StatusCode::NOT_MODIFIED, &headers, Vec::new())
        }
        WorkspaceResourceResponse::Error {
            status,
            total_length,
        } => empty_error_response(status, total_length),
    }
}

fn parse_resource_request(
    request: &Request<Vec<u8>>,
) -> Result<WorkspaceResourceScopeRequest, WorkspaceResourceStatus> {
    let mut segments = request
        .uri()
        .path()
        .strip_prefix('/')
        .unwrap_or_else(|| request.uri().path())
        .split('/')
        .collect::<Vec<_>>();
    if segments.iter().any(|segment| segment.is_empty()) {
        return Err(WorkspaceResourceStatus::BadRequest);
    }

    match request.uri().host() {
        Some(RESOURCE_HOST) => {}
        Some(WINDOWS_RESOURCE_HOST) => {
            if segments.first() != Some(&RESOURCE_HOST) {
                return Err(WorkspaceResourceStatus::BadRequest);
            }
            segments.remove(0);
        }
        _ => return Err(WorkspaceResourceStatus::BadRequest),
    }

    if segments.len() < 3 {
        return Err(WorkspaceResourceStatus::BadRequest);
    }
    let scope_id = segments[0];
    let generation = segments[1]
        .parse::<u64>()
        .ok()
        .filter(|generation| *generation > 0)
        .ok_or(WorkspaceResourceStatus::BadRequest)?;
    if scope_id.is_empty() || scope_id.contains('%') || scope_id.contains('\\') {
        return Err(WorkspaceResourceStatus::BadRequest);
    }

    let mut path_segments = Vec::with_capacity(segments.len() - 2);
    for segment in &segments[2..] {
        path_segments.push(decode_path_segment(segment)?);
    }
    let path = WorkspaceRelativePath::parse(path_segments.join("/"))
        .map_err(|_| WorkspaceResourceStatus::BadRequest)?;
    let range = parse_range(request.headers().get(RANGE))?;
    let if_none_match = request
        .headers()
        .get(IF_NONE_MATCH)
        .and_then(|value| value.to_str().ok())
        .filter(|value| !value.is_empty())
        .map(str::to_owned);

    Ok(WorkspaceResourceScopeRequest {
        scope_id: scope_id.to_owned(),
        generation,
        path,
        range,
        if_none_match,
    })
}

fn decode_path_segment(segment: &str) -> Result<String, WorkspaceResourceStatus> {
    let bytes = segment.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] != b'%' {
            decoded.push(bytes[index]);
            index += 1;
            continue;
        }
        if index + 2 >= bytes.len() {
            return Err(WorkspaceResourceStatus::BadRequest);
        }
        let high = hex_value(bytes[index + 1]).ok_or(WorkspaceResourceStatus::BadRequest)?;
        let low = hex_value(bytes[index + 2]).ok_or(WorkspaceResourceStatus::BadRequest)?;
        decoded.push(high * 16 + low);
        index += 3;
    }
    let decoded = String::from_utf8(decoded).map_err(|_| WorkspaceResourceStatus::BadRequest)?;
    if decoded.is_empty()
        || decoded.contains(['/', '\\', '%'])
        || decoded.chars().any(char::is_control)
    {
        return Err(WorkspaceResourceStatus::BadRequest);
    }
    Ok(decoded)
}

fn hex_value(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        b'A'..=b'F' => Some(value - b'A' + 10),
        _ => None,
    }
}

fn parse_range(
    range: Option<&HeaderValue>,
) -> Result<Option<StorageByteRange>, WorkspaceResourceStatus> {
    let Some(range) = range else {
        return Ok(None);
    };
    let range = range
        .to_str()
        .map_err(|_| WorkspaceResourceStatus::BadRequest)?;
    let range = range
        .strip_prefix("bytes=")
        .filter(|value| !value.contains(','))
        .ok_or(WorkspaceResourceStatus::BadRequest)?;
    let (start, end) = range
        .split_once('-')
        .ok_or(WorkspaceResourceStatus::BadRequest)?;
    let start = start
        .parse::<u64>()
        .map_err(|_| WorkspaceResourceStatus::BadRequest)?;
    let end_inclusive = if end.is_empty() {
        u64::MAX
    } else {
        end.parse::<u64>()
            .map_err(|_| WorkspaceResourceStatus::BadRequest)?
    };
    if end_inclusive < start {
        return Err(WorkspaceResourceStatus::BadRequest);
    }
    Ok(Some(StorageByteRange {
        start,
        end_inclusive: end_inclusive
            .min(start.saturating_add(MAX_RESOURCE_RANGE_BYTES.saturating_sub(1))),
    }))
}

async fn read_body(mut stream: StorageReadStream) -> Result<Vec<u8>, ()> {
    const INITIAL_CAPACITY: usize = 64 * 1024;

    let capacity = usize::try_from(stream.metadata.size.unwrap_or_default())
        .unwrap_or_default()
        .min(INITIAL_CAPACITY);
    let mut body = Vec::with_capacity(capacity);
    while let Some(chunk) = stream.body.next().await {
        let chunk = chunk.map_err(|_| ())?;
        body.try_reserve(chunk.len()).map_err(|_| ())?;
        body.extend_from_slice(&chunk);
    }
    Ok(body)
}

fn response_with_headers(
    status: StatusCode,
    headers: &WorkspaceResourceHeaders,
    body: Vec<u8>,
) -> Response<Vec<u8>> {
    let mut builder = Response::builder()
        .status(status)
        .header(CONTENT_TYPE, headers.content_type.as_str())
        .header(CONTENT_LENGTH, headers.content_length)
        .header(ACCEPT_RANGES, "bytes")
        .header(ETAG, headers.etag.as_str())
        .header(CACHE_CONTROL, headers.cache_control);
    if let Some(range) = headers.content_range {
        builder = builder.header(
            CONTENT_RANGE,
            format!(
                "bytes {}-{}/{}",
                range.start, range.end_inclusive, headers.total_length
            ),
        );
    }
    builder
        .body(body)
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

fn empty_error_response(
    status: WorkspaceResourceStatus,
    total_length: Option<u64>,
) -> Response<Vec<u8>> {
    let mut builder = Response::builder()
        .status(status_code(status))
        .header(CONTENT_LENGTH, 0);
    if status == WorkspaceResourceStatus::RangeNotSatisfiable {
        if let Some(total_length) = total_length {
            builder = builder.header(CONTENT_RANGE, format!("bytes */{total_length}"));
        }
    }
    builder
        .body(Vec::new())
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

fn status_code(status: WorkspaceResourceStatus) -> StatusCode {
    match status {
        WorkspaceResourceStatus::Ok => StatusCode::OK,
        WorkspaceResourceStatus::PartialContent => StatusCode::PARTIAL_CONTENT,
        WorkspaceResourceStatus::NotModified => StatusCode::NOT_MODIFIED,
        WorkspaceResourceStatus::BadRequest => StatusCode::BAD_REQUEST,
        WorkspaceResourceStatus::Forbidden => StatusCode::FORBIDDEN,
        WorkspaceResourceStatus::NotFound => StatusCode::NOT_FOUND,
        WorkspaceResourceStatus::RangeNotSatisfiable => StatusCode::RANGE_NOT_SATISFIABLE,
        WorkspaceResourceStatus::InternalServerError => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        empty_error_response, parse_resource_request, response_with_headers,
        WorkspaceResourceHeaders, WorkspaceResourceStatus, MAX_RESOURCE_RANGE_BYTES,
    };
    use lonanote_core::workspace::StorageByteRange;
    use tauri::http::{
        header::{CONTENT_RANGE, ETAG, RANGE},
        Request, StatusCode,
    };

    #[test]
    fn parses_canonical_scope_url_and_open_ended_range() {
        let request = Request::builder()
            .uri("lonanote-resource://resource/83f8b9b6-b57d-4b06-becd-545309321211/7/assets/a%20b.png")
            .header(RANGE, "bytes=128-")
            .body(Vec::new())
            .unwrap();

        let parsed = parse_resource_request(&request).unwrap();
        assert_eq!(parsed.scope_id, "83f8b9b6-b57d-4b06-becd-545309321211");
        assert_eq!(parsed.generation, 7);
        assert_eq!(parsed.path.as_str(), "assets/a b.png");
        assert_eq!(
            parsed.range,
            Some(StorageByteRange {
                start: 128,
                end_inclusive: 128 + MAX_RESOURCE_RANGE_BYTES - 1,
            })
        );
    }

    #[test]
    fn limits_each_range_to_protocol_buffer_budget() {
        let request = Request::builder()
            .uri("lonanote-resource://resource/83f8b9b6-b57d-4b06-becd-545309321211/1/video.mp4")
            .header(RANGE, "bytes=4096-9999999")
            .body(Vec::new())
            .unwrap();

        let parsed = parse_resource_request(&request).unwrap();
        assert_eq!(
            parsed.range,
            Some(StorageByteRange {
                start: 4096,
                end_inclusive: 4096 + MAX_RESOURCE_RANGE_BYTES - 1,
            })
        );
    }

    #[test]
    fn rejects_escaped_path_separators_and_multiple_ranges() {
        let escaped_separator = Request::builder()
            .uri("lonanote-resource://resource/83f8b9b6-b57d-4b06-becd-545309321211/1/assets%2Fsecret.png")
            .body(Vec::new())
            .unwrap();
        assert_eq!(
            parse_resource_request(&escaped_separator),
            Err(WorkspaceResourceStatus::BadRequest)
        );

        let multiple_ranges = Request::builder()
            .uri("lonanote-resource://resource/83f8b9b6-b57d-4b06-becd-545309321211/1/assets/a.png")
            .header(RANGE, "bytes=0-10,20-30")
            .body(Vec::new())
            .unwrap();
        assert_eq!(
            parse_resource_request(&multiple_ranges),
            Err(WorkspaceResourceStatus::BadRequest)
        );
    }

    #[test]
    fn preserves_gateway_range_and_cache_headers() {
        let response = response_with_headers(
            StatusCode::PARTIAL_CONTENT,
            &WorkspaceResourceHeaders {
                content_type: "image/png".to_string(),
                content_length: 12,
                total_length: 48,
                content_range: Some(StorageByteRange {
                    start: 12,
                    end_inclusive: 23,
                }),
                etag: "W/\"48-7\"".to_string(),
                modified_at: Some(7),
                cache_control: "private, max-age=300",
            },
            vec![1; 12],
        );
        assert_eq!(response.status(), StatusCode::PARTIAL_CONTENT);
        assert_eq!(response.headers()[CONTENT_RANGE], "bytes 12-23/48");
        assert_eq!(response.headers()[ETAG], "W/\"48-7\"");

        let range_error =
            empty_error_response(WorkspaceResourceStatus::RangeNotSatisfiable, Some(48));
        assert_eq!(range_error.status(), StatusCode::RANGE_NOT_SATISFIABLE);
        assert_eq!(range_error.headers()[CONTENT_RANGE], "bytes */48");
    }
}

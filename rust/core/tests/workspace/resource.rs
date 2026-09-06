use futures::TryStreamExt;

use crate::support::{path, provider, WorkspaceTestApp, MANAGED_PROVIDER};
use lonanote_core::workspace::{
    StorageByteRange, WorkspaceResourceResponse, WorkspaceResourceScope,
    WorkspaceResourceScopeRequest, WorkspaceResourceStatus, WriteOptions,
};

fn resource_request(
    scope: &WorkspaceResourceScope,
    range: Option<StorageByteRange>,
    if_none_match: Option<String>,
) -> WorkspaceResourceScopeRequest {
    WorkspaceResourceScopeRequest {
        scope_id: scope.scope_id.clone(),
        generation: scope.generation,
        path: path("assets/image.png"),
        range,
        if_none_match,
    }
}

#[tokio::test]
async fn resource_gateway_scopes_streams_and_revokes_workspace_resources() {
    let app = WorkspaceTestApp::new();
    let manager = app.start().await;
    let workspace = manager
        .create_managed_workspace(provider(MANAGED_PROVIDER), "Resources".into())
        .await
        .unwrap();
    let id = workspace.id;
    let image = path("assets/image.png");
    manager
        .write_bytes(&id, &image, b"0123456789", WriteOptions::default())
        .await
        .unwrap();

    let scope = manager.acquire_resource_scope(&id).await.unwrap();
    let reused_scope = manager.acquire_resource_scope(&id).await.unwrap();
    assert_eq!(reused_scope, scope);

    let full_response = manager
        .open_resource(resource_request(&scope, None, None))
        .await;
    let (etag, full_body) = match full_response {
        WorkspaceResourceResponse::Content(content) => {
            assert_eq!(content.status, WorkspaceResourceStatus::Ok);
            assert_eq!(content.headers.content_type, "image/png");
            assert_eq!(content.headers.content_length, 10);
            assert_eq!(content.headers.total_length, 10);
            assert_eq!(content.headers.content_range, None);
            let body = content
                .body
                .body
                .try_collect::<Vec<Vec<u8>>>()
                .await
                .unwrap()
                .into_iter()
                .flatten()
                .collect::<Vec<u8>>();
            (content.headers.etag, body)
        }
        _ => panic!("资源请求必须返回完整内容"),
    };
    assert_eq!(full_body, b"0123456789");

    let range_response = manager
        .open_resource(resource_request(
            &scope,
            Some(StorageByteRange {
                start: 2,
                end_inclusive: 5,
            }),
            None,
        ))
        .await;
    match range_response {
        WorkspaceResourceResponse::Content(content) => {
            assert_eq!(content.status, WorkspaceResourceStatus::PartialContent);
            assert_eq!(
                content.headers.content_range,
                Some(StorageByteRange {
                    start: 2,
                    end_inclusive: 5,
                })
            );
            let body = content
                .body
                .body
                .try_collect::<Vec<Vec<u8>>>()
                .await
                .unwrap()
                .into_iter()
                .flatten()
                .collect::<Vec<u8>>();
            assert_eq!(body, b"2345");
        }
        _ => panic!("Range 请求必须返回部分内容"),
    }

    let not_modified = manager
        .open_resource(resource_request(&scope, None, Some(etag)))
        .await;
    assert!(matches!(
        not_modified,
        WorkspaceResourceResponse::NotModified { .. }
    ));

    let malformed_range = manager
        .open_resource(resource_request(
            &scope,
            Some(StorageByteRange {
                start: 5,
                end_inclusive: 4,
            }),
            None,
        ))
        .await;
    assert!(matches!(
        malformed_range,
        WorkspaceResourceResponse::Error {
            status: WorkspaceResourceStatus::BadRequest,
            ..
        }
    ));

    let unsatisfied_range = manager
        .open_resource(resource_request(
            &scope,
            Some(StorageByteRange {
                start: 10,
                end_inclusive: 12,
            }),
            None,
        ))
        .await;
    assert!(matches!(
        unsatisfied_range,
        WorkspaceResourceResponse::Error {
            status: WorkspaceResourceStatus::RangeNotSatisfiable,
            total_length: Some(10),
        }
    ));

    manager
        .write_bytes(&id, &image, b"changed", WriteOptions::default())
        .await
        .unwrap();
    let expired_generation = manager
        .open_resource(resource_request(&scope, None, None))
        .await;
    assert!(matches!(
        expired_generation,
        WorkspaceResourceResponse::Error {
            status: WorkspaceResourceStatus::Forbidden,
            ..
        }
    ));
    let refreshed_scope = manager.acquire_resource_scope(&id).await.unwrap();
    assert_eq!(refreshed_scope.scope_id, scope.scope_id);
    assert_ne!(refreshed_scope.generation, scope.generation);

    manager.close_workspace(&id).await.unwrap();
    let revoked_scope = manager
        .open_resource(resource_request(&refreshed_scope, None, None))
        .await;
    assert!(matches!(
        revoked_scope,
        WorkspaceResourceResponse::Error {
            status: WorkspaceResourceStatus::Forbidden,
            ..
        }
    ));
}

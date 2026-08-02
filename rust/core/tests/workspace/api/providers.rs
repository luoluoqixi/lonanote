use crate::support::{invoke_json, EXTERNAL_PROVIDER, MANAGED_PROVIDER};

use super::fixture::{locked_app, run};

#[test]
fn lists_storage_providers() {
    let (_app, _guard) = locked_app();
    run(async {
        let provider_ids: Vec<String> =
            invoke_json("workspace.list_storage_provider_ids", serde_json::json!({})).await;

        assert_eq!(provider_ids, [MANAGED_PROVIDER, EXTERNAL_PROVIDER]);

        let managed_provider_ids: Vec<String> = invoke_json(
            "workspace.list_managed_storage_provider_ids",
            serde_json::json!({}),
        )
        .await;

        assert_eq!(managed_provider_ids, [MANAGED_PROVIDER]);
    });
}

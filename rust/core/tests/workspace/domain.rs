use crate::support::{path, provider, MANAGED_PROVIDER};
use lonanote_core::workspace::{
    StorageProviderId, StorageResourceIdentity, StorageResourceRef, WorkspaceDirectoryName,
    WorkspaceId, WorkspaceLocalSetting, WorkspaceManifest, WorkspaceRelativePath,
    WorkspaceSessionData, WorkspaceSettings, WorkspaceStorageBinding,
    WorkspaceStorageBindingRequest, WorkspaceStorageLocation,
};
use serde_json::json;

#[test]
fn id_json_contract() {
    let id = WorkspaceId::new();
    let encoded = serde_json::to_string(&id).unwrap();

    assert_eq!(serde_json::from_str::<WorkspaceId>(&encoded).unwrap(), id);
    assert_eq!(id.to_string(), id.to_string().to_lowercase());
    assert_eq!(id.to_string().len(), 36);
    assert!(WorkspaceId::parse(id.to_string().to_uppercase()).is_err());
}

#[test]
fn provider_id_validation() {
    for valid in [
        "desktop-documents",
        "app-local",
        "desktop-folder",
        "ios-icloud",
    ] {
        assert_eq!(StorageProviderId::parse(valid).unwrap().as_str(), valid);
    }
    for invalid in ["", " Documents", "iCloud", "a/b", "a\nb"] {
        assert!(StorageProviderId::parse(invalid).is_err(), "{invalid:?}");
    }
}

#[test]
fn storage_resource_ref_validation() {
    let reference = StorageResourceRef::parse("/Users/example/Notes").unwrap();
    assert_eq!(reference.as_str(), "/Users/example/Notes");
    assert_eq!(
        serde_json::to_value(&reference).unwrap(),
        "/Users/example/Notes"
    );
    assert_eq!(
        serde_json::from_value::<StorageResourceRef>(json!("/Users/example/Notes")).unwrap(),
        reference
    );
    for invalid in ["", "   ", "path\nwith-control"] {
        assert!(StorageResourceRef::parse(invalid).is_err(), "{invalid:?}");
    }
}

#[test]
fn binding_distinguishes_reference_and_resource_identity() {
    let identity = StorageResourceIdentity::parse("local-fs:path:/notes").unwrap();
    let first = WorkspaceStorageBinding {
        provider_id: provider("desktop-folder"),
        provider_schema_version: 1,
        location: WorkspaceStorageLocation::External {
            resource_ref: StorageResourceRef::parse("/notes").unwrap(),
        },
        resource_identity: identity.clone(),
    };
    let alias = WorkspaceStorageBinding {
        provider_id: provider("desktop-folder"),
        provider_schema_version: 1,
        location: WorkspaceStorageLocation::External {
            resource_ref: StorageResourceRef::parse("/documents/../notes").unwrap(),
        },
        resource_identity: identity,
    };
    let copy = WorkspaceStorageBinding {
        provider_id: provider("desktop-folder"),
        provider_schema_version: 1,
        location: WorkspaceStorageLocation::External {
            resource_ref: StorageResourceRef::parse("/notes-copy").unwrap(),
        },
        resource_identity: StorageResourceIdentity::parse("local-fs:path:/notes-copy").unwrap(),
    };

    assert_ne!(first, alias);
    assert!(!first.same_reference(&alias));
    assert!(first.same_resource(&alias));
    assert!(!first.same_resource(&copy));

    let mut new_provider_schema = first.clone();
    new_provider_schema.provider_schema_version = 2;
    assert!(first.same_resource(&new_provider_schema));
    assert!(!first.same_reference(&new_provider_schema));

    let mut new_identity = first.clone();
    new_identity.resource_identity =
        StorageResourceIdentity::parse("local-fs:path:/other").unwrap();
    assert!(first.same_reference(&new_identity));
    assert!(!first.same_resource(&new_identity));

    let mut new_provider = first.clone();
    new_provider.provider_id = provider("another-provider");
    assert!(!first.same_resource(&new_provider));

    let managed_alias = WorkspaceStorageBinding {
        provider_id: first.provider_id.clone(),
        provider_schema_version: first.provider_schema_version,
        location: WorkspaceStorageLocation::Managed {
            directory_name: WorkspaceDirectoryName::parse("notes").unwrap(),
        },
        resource_identity: first.resource_identity.clone(),
    };
    assert!(first.same_resource(&managed_alias));
    assert!(!first.same_reference(&managed_alias));

    let encoded = serde_json::to_value(&first).unwrap();
    assert_eq!(encoded["providerSchemaVersion"], 1);
    assert_eq!(encoded["resourceIdentity"], "local-fs:path:/notes");
}

#[test]
fn binding_request_requires_resolution_before_persistence() {
    let request_json = json!({
        "kind": "external",
        "providerId": "desktop-folder",
        "providerSchemaVersion": 1,
        "resourceRef": "/notes"
    });
    let request =
        serde_json::from_value::<WorkspaceStorageBindingRequest>(request_json.clone()).unwrap();

    assert!(serde_json::from_value::<WorkspaceStorageBinding>(request_json).is_err());

    let binding = request.resolve(StorageResourceIdentity::parse("local-fs:path:/notes").unwrap());
    let binding_json = serde_json::to_value(&binding).unwrap();
    assert_eq!(binding_json["kind"], "external");
    assert_eq!(binding_json["resourceIdentity"], "local-fs:path:/notes");
    assert_eq!(
        serde_json::from_value::<WorkspaceStorageBinding>(binding_json).unwrap(),
        binding
    );
}

#[test]
fn directory_name_validation() {
    assert_eq!(
        WorkspaceDirectoryName::from_display_name("个人/笔记").as_str(),
        "个人-笔记"
    );
    assert_eq!(
        WorkspaceDirectoryName::parse("notes")
            .unwrap()
            .with_suffix(2)
            .as_str(),
        "notes-2"
    );
    for invalid in ["", ".", "..", "a/b", "a\\b", "CON", "note.", "note "] {
        assert!(
            WorkspaceDirectoryName::parse(invalid).is_err(),
            "{invalid:?}"
        );
    }
}

#[test]
fn relative_path_validation() {
    for valid in ["", "notes", "notes/today.md", "中文目录/笔记.md"] {
        assert_eq!(WorkspaceRelativePath::parse(valid).unwrap().as_str(), valid);
    }
    for invalid in [
        "/notes",
        "C:/notes",
        "C:notes",
        "notes\\today.md",
        ".",
        "..",
        "notes/../secret",
        "notes/./today.md",
        "notes//today.md",
        "notes/",
        "notes/\ntoday.md",
    ] {
        assert!(
            WorkspaceRelativePath::parse(invalid).is_err(),
            "{invalid:?}"
        );
    }

    let note = path("notes/today.md");
    assert_eq!(note.parent().unwrap().as_str(), "notes");
    assert_eq!(note.file_name().unwrap().as_str(), "today.md");
    assert_eq!(path("notes").join(&path("today.md")), note);
}

#[test]
fn public_json_contract() {
    let id = WorkspaceId::new();
    let binding = WorkspaceStorageBindingRequest {
        provider_id: provider(MANAGED_PROVIDER),
        provider_schema_version: 1,
        location: WorkspaceStorageLocation::Managed {
            directory_name: WorkspaceDirectoryName::parse("个人笔记").unwrap(),
        },
    };
    let binding_json = serde_json::to_value(binding).unwrap();
    assert_eq!(binding_json["kind"], "managed");
    assert_eq!(binding_json["providerId"], MANAGED_PROVIDER);
    assert_eq!(binding_json["providerSchemaVersion"], 1);
    assert_eq!(binding_json["directoryName"], "个人笔记");

    let settings: WorkspaceSettings = serde_json::from_value(json!({
        "schemaVersion": 1,
        "fileTreeSortType": "name",
        "followGitignore": true,
        "customIgnore": "",
        "uploadImagePath": "assets/images",
        "uploadAttachmentPath": "assets/attachments",
        "historySnapshotCount": 37
    }))
    .unwrap();
    assert_eq!(settings.history_snapshot_count, 37);
    let settings_json = serde_json::to_value(settings).unwrap();
    assert_eq!(settings_json["schemaVersion"], 1);
    assert_eq!(settings_json["historySnapshotCount"], 37);
    assert!(settings_json.get("fileTreeSortType").is_none());

    let manifest_json =
        serde_json::to_value(WorkspaceManifest::new(id, "笔记".into(), 123)).unwrap();
    assert_eq!(manifest_json["schemaVersion"], 1);
    assert!(manifest_json.get("settings").is_none());
    assert!(manifest_json.get("storageBinding").is_none());
    assert!(!manifest_json.to_string().contains("resourceRef"));
}

#[test]
fn versioned_models_require_schema() {
    assert!(serde_json::from_value::<WorkspaceSettings>(json!({})).is_err());
    assert!(serde_json::from_value::<WorkspaceLocalSetting>(json!({
        "lastOpenedAt": null,
        "lastOpenFile": null
    }))
    .is_err());
    assert!(serde_json::from_value::<WorkspaceSessionData>(json!({
        "lastWorkspaceId": null
    }))
    .is_err());
}

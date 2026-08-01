use crate::support::{path, provider, MANAGED_PROVIDER};
use lonanote_core::workspace::{
    StorageProviderId, StorageResourceIdentity, StorageResourceRef, WorkspaceDirectoryName,
    WorkspaceId, WorkspaceLocalSetting, WorkspaceManifest, WorkspaceRelativePath,
    WorkspaceSessionData, WorkspaceSettings, WorkspaceStorageBinding,
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
    for valid in ["documents", "desktop-folder", "app-local", "memory"] {
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
    let identity = StorageResourceIdentity::parse("local-fs:unix:1:2").unwrap();
    let first = WorkspaceStorageBinding::External {
        provider_id: provider("desktop-folder"),
        provider_schema_version: 1,
        resource_ref: StorageResourceRef::parse("/notes").unwrap(),
        resource_identity: Some(identity.clone()),
    };
    let alias = WorkspaceStorageBinding::External {
        provider_id: provider("desktop-folder"),
        provider_schema_version: 1,
        resource_ref: StorageResourceRef::parse("/documents/../notes").unwrap(),
        resource_identity: Some(identity),
    };
    let copy = WorkspaceStorageBinding::External {
        provider_id: provider("desktop-folder"),
        provider_schema_version: 1,
        resource_ref: StorageResourceRef::parse("/notes-copy").unwrap(),
        resource_identity: Some(StorageResourceIdentity::parse("local-fs:unix:1:3").unwrap()),
    };

    assert_ne!(first, alias);
    assert!(!first.same_reference(&alias));
    assert!(first.same_resource(&alias));
    assert!(!first.same_resource(&copy));
    let encoded = serde_json::to_value(&first).unwrap();
    assert_eq!(encoded["providerSchemaVersion"], 1);
    assert_eq!(encoded["resourceIdentity"], "local-fs:unix:1:2");
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
    let binding = WorkspaceStorageBinding::Managed {
        provider_id: provider(MANAGED_PROVIDER),
        provider_schema_version: 1,
        directory_name: WorkspaceDirectoryName::parse("个人笔记").unwrap(),
        resource_identity: None,
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

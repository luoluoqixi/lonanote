use crate::support::{path, provider, MANAGED_PROVIDER};
use lonanote_core::workspace::{
    StorageProviderId, WorkspaceDirectoryName, WorkspaceId, WorkspaceManifest,
    WorkspaceRelativePath, WorkspaceSettings, WorkspaceStorageBinding,
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
        directory_name: WorkspaceDirectoryName::parse("个人笔记").unwrap(),
    };
    let binding_json = serde_json::to_value(binding).unwrap();
    assert_eq!(binding_json["kind"], "managed");
    assert_eq!(binding_json["providerId"], MANAGED_PROVIDER);
    assert_eq!(binding_json["directoryName"], "个人笔记");

    let settings: WorkspaceSettings = serde_json::from_value(json!({
        "fileTreeSortType": "name",
        "followGitignore": true,
        "customIgnore": "",
        "uploadImagePath": "assets/images",
        "uploadAttachmentPath": "assets/attachments",
        "historySnapshotCount": 37
    }))
    .unwrap();
    assert_eq!(settings.history_snapshot_count, 37);
    assert_eq!(
        serde_json::to_value(settings).unwrap()["historySnapshotCount"],
        37
    );

    let manifest_json =
        serde_json::to_value(WorkspaceManifest::new(id, "笔记".into(), 123)).unwrap();
    assert_eq!(manifest_json["schemaVersion"], 1);
    assert!(manifest_json.get("storageBinding").is_none());
    assert!(!manifest_json.to_string().contains("resourceRef"));
}

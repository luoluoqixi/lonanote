use std::{path::Path, sync::Arc};

use lonanote_core::workspace::{
    LocalFsResolver, StorageProviderId, WorkspaceCachedSummary, WorkspaceDirectoryName,
    WorkspaceId, WorkspaceManager, WorkspaceManifest, WorkspaceRecord, WorkspaceRelativePath,
    WorkspaceSnapshot, WorkspaceStorageBinding, WorkspaceStorageResolver,
};
use tempfile::TempDir;

pub const MANAGED_PROVIDER: &str = "documents";
pub const EXTERNAL_PROVIDER: &str = "desktop-folder";

pub struct WorkspaceTestApp {
    _temp: TempDir,
    pub data_dir: std::path::PathBuf,
    pub managed_root: std::path::PathBuf,
    pub resolver: Arc<LocalFsResolver>,
}

impl WorkspaceTestApp {
    pub fn new() -> Self {
        let temp = TempDir::new().expect("创建 Workspace 测试目录");
        let data_dir = temp.path().join("app-data");
        let managed_root = temp.path().join("managed");
        std::fs::create_dir_all(&data_dir).expect("创建 app data 目录");
        let resolver = Arc::new(
            LocalFsResolver::new()
                .with_managed_provider(provider(MANAGED_PROVIDER), &managed_root)
                .with_external_provider(provider(EXTERNAL_PROVIDER)),
        );
        Self {
            _temp: temp,
            data_dir,
            managed_root,
            resolver,
        }
    }

    pub async fn start(&self) -> WorkspaceManager {
        WorkspaceManager::load(
            &self.data_dir,
            Arc::clone(&self.resolver) as Arc<dyn WorkspaceStorageResolver>,
        )
        .await
        .expect("启动 WorkspaceManager")
    }

    pub fn external_dir(&self, name: &str) -> std::path::PathBuf {
        let directory = self._temp.path().join(name);
        std::fs::create_dir_all(&directory).expect("创建外部 Workspace 目录");
        directory
    }

    pub fn managed_workspace_root(&self, snapshot: &WorkspaceSnapshot) -> std::path::PathBuf {
        self.managed_root
            .join("workspaces")
            .join(snapshot.storage.directory_name.as_ref().unwrap().as_str())
    }

    pub fn read_manifest(&self, snapshot: &WorkspaceSnapshot) -> WorkspaceManifest {
        let bytes = std::fs::read(
            self.managed_workspace_root(snapshot)
                .join(".lonanote/manifest.json"),
        )
        .expect("读取 manifest.json");
        serde_json::from_slice(&bytes).expect("解析 manifest.json")
    }
}

pub fn provider(value: &str) -> StorageProviderId {
    StorageProviderId::parse(value).expect("测试中的 provider 必须有效")
}

pub fn path(value: &str) -> WorkspaceRelativePath {
    WorkspaceRelativePath::parse(value).expect("测试中的相对路径必须有效")
}

pub fn external_binding(root: impl AsRef<Path>) -> WorkspaceStorageBinding {
    WorkspaceStorageBinding::External {
        provider_id: provider(EXTERNAL_PROVIDER),
        resource_ref: root.as_ref().to_string_lossy().into_owned(),
    }
}

pub fn test_record(display_name: &str, root: impl AsRef<Path>) -> WorkspaceRecord {
    WorkspaceRecord {
        id: WorkspaceId::new(),
        storage_binding: external_binding(root),
        cached_summary: WorkspaceCachedSummary {
            display_name: display_name.to_string(),
            created_at: Some(1),
            last_validated_at: Some(1),
        },
    }
}

pub fn managed_binding(directory_name: &str) -> WorkspaceStorageBinding {
    WorkspaceStorageBinding::Managed {
        provider_id: provider(MANAGED_PROVIDER),
        directory_name: WorkspaceDirectoryName::parse(directory_name).unwrap(),
    }
}

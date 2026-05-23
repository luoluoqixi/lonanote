use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    sync::{LazyLock, RwLock},
};

use relative_path::RelativePathBuf;
use serde::{Deserialize, Serialize};

use super::{
    config::{WORKSPACE_CONFIG_FOLDER, WORKSPACE_SETTINGS_FILE},
    error::WorkspaceError,
    workspace_path::WorkspacePath,
    workspace_settings::WorkspaceSettings,
};

pub const DEFAULT_WORKSPACES_DIR_NAME: &str = "workspaces";

pub fn workspace_root_path(base_path: impl AsRef<Path>) -> PathBuf {
    let base_path = base_path.as_ref();
    let already_workspace_dir = base_path
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name == DEFAULT_WORKSPACES_DIR_NAME);
    if already_workspace_dir {
        return base_path.to_path_buf();
    }

    base_path.join(DEFAULT_WORKSPACES_DIR_NAME)
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum WorkspaceRootKind {
    Desktop,
    MobileAppSandbox,
    MobileAppCloud,
    MobileAppExternalSandbox,
    Custom,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum WorkspaceRootSourceKind {
    SystemDefault,
    UserAdded,
    IosBookmark,
    AndroidTreeUri,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WorkspaceRootSource {
    SystemDefault,
    UserAdded,
    IosBookmark { bookmark_id: String },
    AndroidTreeUri { tree_uri: String },
}

impl WorkspaceRootSource {
    pub const fn kind(&self) -> WorkspaceRootSourceKind {
        match self {
            Self::SystemDefault => WorkspaceRootSourceKind::SystemDefault,
            Self::UserAdded => WorkspaceRootSourceKind::UserAdded,
            Self::IosBookmark { .. } => WorkspaceRootSourceKind::IosBookmark,
            Self::AndroidTreeUri { .. } => WorkspaceRootSourceKind::AndroidTreeUri,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRoot {
    pub key: String,
    pub path: PathBuf,
    #[serde(default = "WorkspaceRoot::default_kind")]
    pub kind: WorkspaceRootKind,
    #[serde(default = "WorkspaceRoot::default_source")]
    pub source: WorkspaceRootSource,
}

impl WorkspaceRoot {
    pub const fn default_kind() -> WorkspaceRootKind {
        WorkspaceRootKind::Custom
    }

    pub const fn default_source() -> WorkspaceRootSource {
        WorkspaceRootSource::UserAdded
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WorkspaceLocator {
    AbsolutePath {
        path: PathBuf,
    },
    ManagedRoot {
        root_key: String,
        relative_path: RelativePathBuf,
    },
    IosBookmark {
        bookmark_id: String,
    },
    AndroidTreeUri {
        tree_uri: String,
    },
}

impl WorkspaceLocator {
    pub fn from_path(path: &Path, roots: &[WorkspaceRoot]) -> Self {
        if let Some((root_key, relative_path)) = find_managed_root_for_path(path, roots) {
            return Self::ManagedRoot {
                root_key,
                relative_path,
            };
        }

        Self::AbsolutePath {
            path: path.to_path_buf(),
        }
    }

    #[allow(dead_code)]
    pub fn resolve_path(&self, roots: &[WorkspaceRoot]) -> Option<PathBuf> {
        match self {
            Self::AbsolutePath { path } => Some(path.clone()),
            Self::ManagedRoot {
                root_key,
                relative_path,
            } => roots
                .iter()
                .find(|root| root.key == *root_key)
                .map(|root| relative_path.to_logical_path(&root.path)),
            Self::IosBookmark { .. } | Self::AndroidTreeUri { .. } => None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct DiscoveredWorkspace {
    pub path: PathBuf,
    pub name: String,
    pub locator: WorkspaceLocator,
    pub settings: Option<WorkspaceSettings>,
}

impl DiscoveredWorkspace {
    pub fn workspace_id(&self) -> Option<&str> {
        self.settings
            .as_ref()
            .map(|settings| settings.id.trim())
            .filter(|id| !id.is_empty())
    }

    pub fn create_time(&self) -> Option<u64> {
        self.settings
            .as_ref()
            .and_then(|settings| settings.create_time)
    }
}

static WORKSPACE_ROOTS: LazyLock<RwLock<Vec<WorkspaceRoot>>> =
    LazyLock::new(|| RwLock::new(Vec::new()));

pub fn get_workspace_roots() -> Vec<WorkspaceRoot> {
    WORKSPACE_ROOTS.read().unwrap().clone()
}

pub fn find_workspace_root(key: &str) -> Option<WorkspaceRoot> {
    get_workspace_roots()
        .into_iter()
        .find(|root| root.key == key)
}

pub fn normalize_workspace_roots(roots: Vec<WorkspaceRoot>) -> Vec<WorkspaceRoot> {
    let mut seen = HashSet::new();
    let mut normalized = Vec::new();
    for root in roots {
        let key = root.key.trim();
        if key.is_empty() || !seen.insert(key.to_string()) {
            continue;
        }

        normalized.push(WorkspaceRoot {
            key: key.to_string(),
            path: workspace_root_path(root.path),
            kind: root.kind,
            source: root.source,
        });
    }

    normalized
}

pub fn set_workspace_roots(roots: Vec<WorkspaceRoot>) {
    *WORKSPACE_ROOTS.write().unwrap() = normalize_workspace_roots(roots);
}

pub fn scan_workspace_roots() -> Result<Vec<DiscoveredWorkspace>, WorkspaceError> {
    let roots = get_workspace_roots();
    let mut workspaces = Vec::new();
    for root in &roots {
        if !root.path.exists() || !root.path.is_dir() {
            continue;
        }

        for entry in
            fs::read_dir(&root.path).map_err(|err| WorkspaceError::IOError(err.to_string()))?
        {
            let entry = entry.map_err(|err| WorkspaceError::IOError(err.to_string()))?;
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let name = path
                .file_name()
                .and_then(|name| name.to_str())
                .ok_or(WorkspaceError::UnknowError(format!(
                    "parse workspace name error: {path:?}"
                )))?
                .to_string();

            workspaces.push(DiscoveredWorkspace {
                locator: WorkspaceLocator::from_path(&path, &roots),
                settings: load_workspace_settings_from_path(&path)?,
                path,
                name,
            });
        }
    }

    Ok(workspaces)
}

fn find_managed_root_for_path(
    path: &Path,
    roots: &[WorkspaceRoot],
) -> Option<(String, RelativePathBuf)> {
    roots.iter().find_map(|root| {
        let relative = path.strip_prefix(&root.path).ok()?;
        let relative = RelativePathBuf::from_path(relative).ok()?;
        if relative.as_str().is_empty() {
            return None;
        }

        Some((root.key.clone(), relative))
    })
}

fn load_workspace_settings_from_path(
    path: &Path,
) -> Result<Option<WorkspaceSettings>, WorkspaceError> {
    let config_path = path
        .join(WORKSPACE_CONFIG_FOLDER)
        .join(WORKSPACE_SETTINGS_FILE);
    if !config_path.exists() {
        return Ok(None);
    }

    let data =
        fs::read_to_string(config_path).map_err(|err| WorkspaceError::IOError(err.to_string()))?;
    let mut settings = serde_json::from_str::<WorkspaceSettings>(&data)
        .map_err(|err| WorkspaceError::ParseConfigError(err.to_string()))?;
    settings.workspace_path = WorkspacePath::from(path.as_os_str());
    Ok(Some(settings))
}

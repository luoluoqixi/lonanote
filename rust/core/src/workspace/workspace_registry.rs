use std::{
    collections::{HashMap, HashSet},
    fs,
};

use serde::{Deserialize, Serialize};

use crate::{
    utils::{fs_utils, time_utils::get_now_timestamp},
    workspace::{config::DefaultWorkspace, workspace_settings::WorkspaceSettings},
};

use super::{
    config::get_workspace_global_config_path,
    error::WorkspaceError,
    workspace_locator::{
        find_workspace_root, get_workspace_roots, normalize_workspace_roots, scan_workspace_roots,
        set_workspace_roots, DiscoveredWorkspace, WorkspaceLocator, WorkspaceRoot,
        WorkspaceRootSourceKind,
    },
    workspace_metadata::WorkspaceMetadata,
    workspace_path::WorkspacePath,
    workspace_savedata::WorkspaceSaveData,
};

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSyncSummary {
    pub imported_count: usize,
    pub relocated_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRecord {
    pub metadata: WorkspaceMetadata,
    pub locator: WorkspaceLocator,
    pub save_data: WorkspaceSaveData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceRegistry {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_workspace_id: Option<String>,
    #[serde(default)]
    pub workspace_roots: Vec<WorkspaceRoot>,
    #[serde(default)]
    pub workspace_records: HashMap<String, WorkspaceRecord>,
}

impl WorkspaceRegistry {
    pub fn new() -> Self {
        let config_path = get_workspace_global_config_path();
        if config_path.exists() {
            let data = fs::read_to_string(config_path)
                .map_err(|err| WorkspaceError::IOError(err.to_string()))
                .expect("read workspace config error");
            let registry = serde_json::from_str::<WorkspaceRegistry>(&data);
            if let Ok(mut registry) = registry {
                set_workspace_roots(registry.workspace_roots.clone());
                if registry.normalize_loaded_state() {
                    if let Err(err) = registry.save() {
                        log::warn!("normalize workspace registry state error: {err}");
                    }
                }
                return registry;
            } else if cfg!(debug_assertions) {
                eprintln!(
                    "Error parsing workspace registry config: {:?}",
                    registry.err()
                );
            }
        }

        set_workspace_roots(Vec::new());
        Self {
            last_workspace_id: None,
            workspace_roots: Vec::new(),
            workspace_records: HashMap::new(),
        }
    }

    pub fn get_workspace_roots(&self) -> Vec<WorkspaceRoot> {
        self.workspace_roots.clone()
    }

    pub fn set_workspace_roots(&mut self, roots: Vec<WorkspaceRoot>) -> Result<(), WorkspaceError> {
        let incoming_roots = normalize_workspace_roots(roots);
        let incoming_source_kinds = incoming_roots
            .iter()
            .map(|root| root.source.kind())
            .collect::<HashSet<WorkspaceRootSourceKind>>();

        let mut next_roots = incoming_roots;
        next_roots.extend(
            self.workspace_roots
                .iter()
                .filter(|root| !incoming_source_kinds.contains(&root.source.kind()))
                .cloned(),
        );
        let next_roots = normalize_workspace_roots(next_roots);

        if self.workspace_roots == next_roots {
            set_workspace_roots(next_roots);
            return Ok(());
        }

        self.workspace_roots = next_roots.clone();
        set_workspace_roots(next_roots);

        for workspace_id in self.workspace_records.keys().cloned().collect::<Vec<_>>() {
            self.refresh_workspace_record(&workspace_id);
        }

        self.save()?;

        Ok(())
    }

    pub async fn init_setup(&mut self, path: &WorkspacePath) -> Result<(), WorkspaceError> {
        let mut settings = crate::settings::get_settings_mut().await;

        if settings.first_setup {
            log::info!("start import init data...");

            if self.workspace_records.is_empty() {
                let record = self.create_workspace(path)?;
                self.import_init_data(path)?;
                self.last_workspace_id = Some(record.metadata.id);
                log::info!("import init data finish");
            } else {
                log::info!("workspaces is not empty, jump import");
            }

            settings.first_setup = false;
            settings
                .save()
                .map_err(|err| WorkspaceError::InitError(format!("{err}")))?;
        } else {
            log::info!("first_setup is false, jump import data");
        }

        Ok(())
    }

    pub fn import_init_data(&self, path: &WorkspacePath) -> Result<(), WorkspaceError> {
        for file_path in DefaultWorkspace::iter() {
            if let Some(file) = DefaultWorkspace::get(file_path.as_ref()) {
                let bytes = file.data.as_ref();

                let mut out_path = path.to_path_buf();
                out_path.push(file_path.as_ref());

                if let Some(parent) = out_path.parent() {
                    fs::create_dir_all(parent)
                        .map_err(|err| WorkspaceError::IOError(format!("{err}")))?;
                }
                fs::write(&out_path, bytes)
                    .map_err(|err| WorkspaceError::IOError(format!("{err}")))?;
            }
        }
        log::info!("import init data: {}", path.to_path_buf().display());

        Ok(())
    }

    pub fn create_workspace(
        &mut self,
        path: &WorkspacePath,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        let path_buf = path.to_path_buf();
        if !path_buf.exists() {
            fs::create_dir_all(&path_buf)
                .map_err(|err| WorkspaceError::IOError(err.to_string()))?;
        } else if path_buf.is_file() {
            return Err(WorkspaceError::IOError(format!(
                "the path is a file: {}",
                path_buf.display()
            )));
        }
        if self.find_workspace_record_by_path(path).is_some() {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                path_buf.display().to_string(),
            ));
        }

        let time = get_now_timestamp();
        let mut settings = WorkspaceSettings::new(path)?;
        let mut settings_changed = false;
        if settings.ensure_id() {
            settings_changed = true;
        }
        if settings.create_time.is_none() {
            settings.create_time = Some(time);
            settings_changed = true;
        }
        if settings_changed {
            settings.save_sync()?;
        }

        let mut metadata = WorkspaceMetadata::new(path, settings.id.clone())?;
        metadata.update_create_time(settings.create_time.unwrap_or(time));
        metadata.update_update_time(time);

        let workspace_id = settings.id.clone();
        let record = WorkspaceRecord {
            metadata,
            locator: WorkspaceLocator::from_path(path.as_path(), &get_workspace_roots()),
            save_data: WorkspaceSaveData::new(workspace_id.clone()),
        };

        self.workspace_records.insert(workspace_id, record.clone());

        self.save()?;

        Ok(record)
    }

    pub fn create_workspace_in_root(
        &mut self,
        root_key: impl AsRef<str>,
        name: impl AsRef<str>,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        let root = find_workspace_root(root_key.as_ref())
            .ok_or(WorkspaceError::NotFoundPath(root_key.as_ref().to_string()))?;
        let path = root.path.join(name.as_ref());
        let workspace_path = WorkspacePath::from(path.as_os_str());
        self.create_workspace(&workspace_path)
    }

    pub fn list_workspace_records(&self) -> Vec<WorkspaceRecord> {
        let mut records = self.workspace_records.values().cloned().collect::<Vec<_>>();
        records.sort_by(|a, b| a.metadata.name.cmp(&b.metadata.name));
        records
    }

    pub fn get_workspace_record(&self, workspace_id: &str) -> Option<&WorkspaceRecord> {
        self.workspace_records.get(workspace_id)
    }

    pub fn get_last_workspace_id(&self) -> Option<String> {
        self.last_workspace_id.clone()
    }

    pub fn get_workspace_path(&self, workspace_id: &str) -> Result<WorkspacePath, WorkspaceError> {
        self.workspace_records
            .get(workspace_id)
            .map(|record| record.metadata.path.clone())
            .ok_or(WorkspaceError::NotFoundWorkspace(workspace_id.to_string()))
    }

    pub fn get_workspace_settings(
        &self,
        workspace_id: &str,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        let record = self
            .workspace_records
            .get(workspace_id)
            .ok_or(WorkspaceError::NotFoundWorkspace(workspace_id.to_string()))?;
        let now_timestamp = get_now_timestamp();
        Self::load_workspace_settings(
            workspace_id,
            &record.metadata.path,
            record.metadata.create_time,
            now_timestamp,
        )
    }

    pub fn set_workspace_settings(
        &mut self,
        workspace_id: &str,
        mut settings: WorkspaceSettings,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        let now_timestamp = get_now_timestamp();
        let path = self.get_workspace_path(workspace_id)?;
        settings.workspace_path = path;
        settings.id = workspace_id.to_string();
        if settings.create_time.is_none() {
            settings.create_time = self
                .workspace_records
                .get(workspace_id)
                .and_then(|record| record.metadata.create_time)
                .or(Some(now_timestamp));
        }
        settings.save_sync()?;

        let record = self
            .workspace_records
            .get_mut(workspace_id)
            .ok_or(WorkspaceError::NotFoundWorkspace(workspace_id.to_string()))?;
        record
            .metadata
            .update_create_time(settings.create_time.unwrap_or(now_timestamp));
        record.metadata.update_update_time(now_timestamp);

        self.save()?;
        Ok(settings)
    }

    pub fn set_workspace_savedata(
        &mut self,
        workspace_id: &str,
        mut savedata: WorkspaceSaveData,
    ) -> Result<(), WorkspaceError> {
        let record = self
            .workspace_records
            .get_mut(workspace_id)
            .ok_or(WorkspaceError::NotFoundWorkspace(workspace_id.to_string()))?;
        savedata.ensure_id(workspace_id);
        record.save_data = savedata;

        self.save()?;
        Ok(())
    }

    pub fn get_workspace_savedata(
        &self,
        workspace_id: &str,
    ) -> Result<&WorkspaceSaveData, WorkspaceError> {
        self.workspace_records
            .get(workspace_id)
            .map(|record| &record.save_data)
            .ok_or(WorkspaceError::NotFoundWorkspace(workspace_id.to_string()))
    }

    pub fn remove_workspace(
        &mut self,
        workspace_id: &str,
        delete_file: bool,
    ) -> Result<(), WorkspaceError> {
        let record = self
            .workspace_records
            .remove(workspace_id)
            .ok_or(WorkspaceError::NotFoundWorkspace(workspace_id.to_string()))?;
        if self.last_workspace_id.as_ref() == Some(&record.metadata.id) {
            self.last_workspace_id = None;
        }
        if delete_file && record.metadata.path.exists() {
            let workspace_path = record.metadata.path.to_path_buf();
            fs::remove_dir_all(workspace_path)
                .map_err(|err| WorkspaceError::IOError(format!("delete dir error: {err}")))?;
        }

        self.save()?;
        Ok(())
    }

    pub fn set_workspace_name(
        &mut self,
        workspace_id: &str,
        new_name: impl AsRef<str>,
        is_move: bool,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        let current_path = self.get_workspace_path(workspace_id)?;
        let new_path = current_path
            .to_path_buf_cow()
            .parent()
            .ok_or(WorkspaceError::UnknowError(format!(
                "path is no parent: {:?}",
                current_path.to_path_buf_cow()
            )))?
            .join(new_name.as_ref());
        let new_path = new_path.to_str().ok_or(WorkspaceError::UnknowError(
            "parse path str error".to_string(),
        ))?;

        self.set_workspace_path(workspace_id, &WorkspacePath::from(new_path), is_move)
    }

    pub fn set_workspace_path(
        &mut self,
        workspace_id: &str,
        new_path: &WorkspacePath,
        is_move: bool,
    ) -> Result<WorkspaceRecord, WorkspaceError> {
        let current_path = self.get_workspace_path(workspace_id)?;

        if current_path == *new_path {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                new_path.to_path_buf_cow().display().to_string(),
            ));
        }

        if self.workspace_path_exists(new_path, Some(workspace_id)) {
            return Err(WorkspaceError::AlreadyExistWorkspace(
                new_path.to_path_buf_cow().display().to_string(),
            ));
        }

        if is_move {
            if new_path.exists() {
                return Err(WorkspaceError::IOError(format!(
                    "target path already exist: {:?}",
                    new_path.to_path_buf_cow().display()
                )));
            }
            fs_utils::copy(current_path.to_path_buf(), new_path.to_path_buf(), false).map_err(
                |err| {
                    WorkspaceError::IOError(format!(
                        "copy folder error: {} >> {}, {}",
                        current_path.to_path_buf_cow().display(),
                        new_path.to_path_buf_cow().display(),
                        err,
                    ))
                },
            )?;
            fs::remove_dir_all(current_path.to_path_buf()).map_err(|err| {
                WorkspaceError::IOError(format!(
                    "delete origin folder error: {}, {}",
                    current_path.to_path_buf_cow().display(),
                    err,
                ))
            })?;
        }

        let updated_record = {
            let record = self
                .workspace_records
                .get_mut(workspace_id)
                .ok_or(WorkspaceError::NotFoundWorkspace(workspace_id.to_string()))?;

            let create_time = record.metadata.create_time;
            let update_time = record.metadata.update_time;
            let mut new_metadata = WorkspaceMetadata::new(new_path, workspace_id.to_string())?;
            new_metadata.create_time = create_time;
            new_metadata.update_time = update_time;

            record.metadata = new_metadata;
            record.locator =
                WorkspaceLocator::from_path(new_path.as_path(), &get_workspace_roots());
            record.clone()
        };
        self.save()?;

        Ok(updated_record)
    }

    pub fn prepare_workspace_open(
        &mut self,
        workspace_id: &str,
    ) -> Result<(WorkspacePath, WorkspaceSettings), WorkspaceError> {
        let path = self.get_workspace_path(workspace_id)?;
        if !path.exists() {
            return Err(WorkspaceError::NotFoundPath(
                path.to_path_buf_cow().display().to_string(),
            ));
        }

        let now_timestamp = get_now_timestamp();
        let fallback_create_time = self
            .workspace_records
            .get(workspace_id)
            .and_then(|record| record.metadata.create_time);
        let settings = Self::load_workspace_settings(
            workspace_id,
            &path,
            fallback_create_time,
            now_timestamp,
        )?;

        let record = self
            .workspace_records
            .get_mut(workspace_id)
            .ok_or(WorkspaceError::NotFoundWorkspace(workspace_id.to_string()))?;
        record
            .metadata
            .update_create_time(settings.create_time.unwrap_or(now_timestamp));
        record.metadata.update_update_time(now_timestamp);
        record.locator = WorkspaceLocator::from_path(path.as_path(), &get_workspace_roots());
        record.save_data.ensure_id(workspace_id);

        self.last_workspace_id = Some(workspace_id.to_string());
        self.save()?;

        Ok((path, settings))
    }

    pub fn sync_workspace_roots(&mut self) -> Result<WorkspaceSyncSummary, WorkspaceError> {
        let mut summary = WorkspaceSyncSummary::default();
        let mut changed = false;
        let discovered = scan_workspace_roots()?;
        let mut used_discovered = HashSet::new();

        let workspace_ids = self.workspace_records.keys().cloned().collect::<Vec<_>>();
        for workspace_id in &workspace_ids {
            if let Some(found_index) = discovered
                .iter()
                .position(|workspace| workspace.workspace_id() == Some(workspace_id.as_str()))
            {
                if used_discovered.insert(found_index)
                    && self.apply_discovered_workspace(
                        workspace_id,
                        &discovered[found_index],
                        &mut summary,
                    )?
                {
                    changed = true;
                }
            } else if self.refresh_workspace_record(workspace_id) {
                changed = true;
            }
        }

        let mut known_ids = self
            .workspace_records
            .keys()
            .cloned()
            .collect::<HashSet<_>>();
        let mut known_paths = self
            .workspace_records
            .values()
            .map(|record| record.metadata.path.to_string_lossy())
            .collect::<HashSet<_>>();

        for (index, workspace) in discovered.iter().enumerate() {
            if used_discovered.contains(&index) {
                continue;
            }

            let Some(workspace_id) = workspace.workspace_id().map(str::to_string) else {
                log::warn!(
                    "skip workspace without id during roots sync: {}",
                    workspace.path.display()
                );
                continue;
            };

            let workspace_path = WorkspacePath::from(workspace.path.as_os_str());
            let workspace_path_string = workspace_path.to_string_lossy();
            if known_ids.contains(&workspace_id) || known_paths.contains(&workspace_path_string) {
                continue;
            }

            let mut metadata = WorkspaceMetadata::new(&workspace_path, workspace_id.clone())?;
            metadata.create_time = workspace.create_time();

            self.workspace_records.insert(
                workspace_id.clone(),
                WorkspaceRecord {
                    metadata,
                    locator: workspace.locator.clone(),
                    save_data: WorkspaceSaveData::new(workspace_id.clone()),
                },
            );
            known_ids.insert(workspace_id);
            known_paths.insert(workspace_path_string);
            summary.imported_count += 1;
            changed = true;
        }

        if self
            .last_workspace_id
            .as_ref()
            .is_some_and(|workspace_id| !known_ids.contains(workspace_id))
        {
            self.last_workspace_id = None;
            changed = true;
        }

        if changed {
            self.save()?;
        }

        Ok(summary)
    }

    pub fn save(&self) -> Result<(), WorkspaceError> {
        let config_path = get_workspace_global_config_path();
        let parent = config_path
            .parent()
            .ok_or(WorkspaceError::UnknowError(format!(
                "config_path no parent: {:?}",
                &config_path
            )))?;
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|err| WorkspaceError::IOError(err.to_string()))?;
        }
        let s = serde_json::to_string_pretty(self)
            .map_err(|err| WorkspaceError::JsonError(err.to_string()))?;
        fs::write(config_path, s).map_err(|err| WorkspaceError::IOError(err.to_string()))?;

        Ok(())
    }

    fn normalize_loaded_state(&mut self) -> bool {
        let mut changed = false;

        let current_roots = std::mem::take(&mut self.workspace_roots);
        let normalized_roots = normalize_workspace_roots(current_roots);
        if self.workspace_roots != normalized_roots {
            changed = true;
        }
        self.workspace_roots = normalized_roots;
        set_workspace_roots(self.workspace_roots.clone());

        let current_records = std::mem::take(&mut self.workspace_records);
        let mut normalized_records = HashMap::new();
        for (workspace_id, mut record) in current_records {
            let normalized_id = record.metadata.id.trim().to_string();
            if normalized_id.is_empty() {
                changed = true;
                continue;
            }
            if workspace_id != normalized_id {
                changed = true;
            }
            if record.save_data.ensure_id(&normalized_id) {
                changed = true;
            }
            normalized_records.entry(normalized_id).or_insert(record);
        }
        self.workspace_records = normalized_records;

        let known_ids = self
            .workspace_records
            .keys()
            .cloned()
            .collect::<HashSet<_>>();

        for workspace_id in &known_ids {
            if self.refresh_workspace_record(workspace_id) {
                changed = true;
            }
        }

        if self
            .last_workspace_id
            .as_ref()
            .is_some_and(|workspace_id| !known_ids.contains(workspace_id))
        {
            self.last_workspace_id = None;
            changed = true;
        }

        changed
    }

    fn apply_discovered_workspace(
        &mut self,
        workspace_id: &str,
        discovered_workspace: &DiscoveredWorkspace,
        summary: &mut WorkspaceSyncSummary,
    ) -> Result<bool, WorkspaceError> {
        let mut changed = false;
        let record = self
            .workspace_records
            .get_mut(workspace_id)
            .ok_or(WorkspaceError::NotFoundWorkspace(workspace_id.to_string()))?;
        let path = WorkspacePath::from(discovered_workspace.path.as_os_str());
        if record.metadata.path != path {
            record.metadata.path = path;
            summary.relocated_count += 1;
            changed = true;
        }
        if record.metadata.name != discovered_workspace.name {
            record.metadata.name = discovered_workspace.name.clone();
            changed = true;
        }
        if record.metadata.create_time.is_none() {
            if let Some(create_time) = discovered_workspace.create_time() {
                record.metadata.create_time = Some(create_time);
                changed = true;
            }
        }

        if record.locator != discovered_workspace.locator {
            record.locator = discovered_workspace.locator.clone();
            changed = true;
        }
        if record.save_data.ensure_id(workspace_id) {
            changed = true;
        }

        Ok(changed)
    }

    fn refresh_workspace_record(&mut self, workspace_id: &str) -> bool {
        let Some(record) = self.workspace_records.get_mut(workspace_id) else {
            return false;
        };

        let locator =
            WorkspaceLocator::from_path(record.metadata.path.as_path(), &get_workspace_roots());
        let mut changed = false;
        if record.metadata.id != workspace_id {
            record.metadata.id = workspace_id.to_string();
            changed = true;
        }
        if record.locator != locator {
            record.locator = locator;
            changed = true;
        }
        if record.save_data.ensure_id(workspace_id) {
            changed = true;
        }

        changed
    }

    fn find_workspace_record_by_path(&self, path: &WorkspacePath) -> Option<&WorkspaceRecord> {
        self.workspace_records
            .values()
            .find(|record| record.metadata.path == *path)
    }

    fn workspace_path_exists(
        &self,
        path: &WorkspacePath,
        exclude_workspace_id: Option<&str>,
    ) -> bool {
        self.workspace_records.iter().any(|(workspace_id, record)| {
            if exclude_workspace_id == Some(workspace_id.as_str()) {
                return false;
            }
            record.metadata.path == *path
        })
    }

    fn load_workspace_settings(
        workspace_id: &str,
        workspace_path: &WorkspacePath,
        create_time_hint: Option<u64>,
        now_timestamp: u64,
    ) -> Result<WorkspaceSettings, WorkspaceError> {
        let mut settings = WorkspaceSettings::new(workspace_path)?;
        let mut changed = false;
        if settings.id != workspace_id {
            settings.id = workspace_id.to_string();
            changed = true;
        }
        if settings.create_time.is_none() {
            settings.create_time = create_time_hint.or(Some(now_timestamp));
            changed = true;
        }
        if changed {
            settings.save_sync()?;
        }

        Ok(settings)
    }
}

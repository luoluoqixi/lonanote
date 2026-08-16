use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex, OnceLock,
    },
};

use anyhow::{anyhow, Result};
use craby::{prelude::*, throw};
use log::{LevelFilter, Log, Metadata, Record};
use lonanote_core::workspace::{
    install_workspace_manager, LocalFsResolver, StorageProviderId, WorkspaceManager,
    WorkspaceStorageResolver,
};
use lonanote_core::{
    invoke_command, invoke_command_async, CommandContext, CommandResponse, CommandResult,
};
use tokio::{runtime::Runtime, sync::oneshot};

use crate::ffi::bridging::*;
use crate::generated::*;

type CallbackSender = oneshot::Sender<Result<Option<String>, String>>;

const APP_LOCAL_PROVIDER_ID: &str = "app-local";
const LOG_THIRD_LIST: &[&str] = &["tao", "globset", "ignore"];

struct InitResult {
    app_data_path: PathBuf,
    managed_workspace_path: PathBuf,
    system_locale: String,
    error: Option<String>,
}

static INIT_RESULT: OnceLock<InitResult> = OnceLock::new();
static RUNTIME_RESULT: OnceLock<Result<Runtime, String>> = OnceLock::new();
static NATIVE_LOGGER: OnceLock<NativeRustLogger> = OnceLock::new();
static NATIVE_LOGGER_INIT_RESULT: OnceLock<Result<(), String>> = OnceLock::new();
static CALLBACK_ID: AtomicU64 = AtomicU64::new(1);
static PENDING_CALLBACKS: OnceLock<Mutex<HashMap<String, CallbackSender>>> = OnceLock::new();

fn canonicalize_directory(path: &str, field: &str) -> Result<PathBuf> {
    if path.trim().is_empty() {
        return Err(anyhow!("{field} 不能为空"));
    }
    let path = Path::new(path);
    if !path.is_absolute() {
        return Err(anyhow!("{field} 必须是绝对路径"));
    }
    std::fs::canonicalize(path).map_err(|error| anyhow!("解析 {field} 失败: {error}"))
}

fn prepare_directory(path: &str, field: &str) -> Result<PathBuf> {
    if path.trim().is_empty() {
        return Err(anyhow!("{field} 不能为空"));
    }
    let path = Path::new(path);
    if !path.is_absolute() {
        return Err(anyhow!("{field} 必须是绝对路径"));
    }
    std::fs::create_dir_all(path).map_err(|error| anyhow!("创建 {field} 失败: {error}"))?;
    std::fs::canonicalize(path).map_err(|error| anyhow!("解析 {field} 失败: {error}"))
}

fn initialize_native_runtime(
    module_id: usize,
    module_data_path: &str,
    app_data_path: &str,
    managed_workspace_path: &str,
    system_locale: &str,
) -> Result<()> {
    let module_data_path = canonicalize_directory(module_data_path, "module data path")?;
    let app_data_path = prepare_directory(app_data_path, "app data path")?;
    let managed_workspace_path =
        prepare_directory(managed_workspace_path, "managed workspace path")?;
    let system_locale = system_locale.trim().to_string();
    validate_native_storage_paths(&module_data_path, &app_data_path, &managed_workspace_path)?;

    let result = INIT_RESULT.get_or_init(|| InitResult {
        app_data_path: app_data_path.clone(),
        managed_workspace_path: managed_workspace_path.clone(),
        system_locale: system_locale.clone(),
        error: initialize_native_runtime_once(
            module_id,
            &app_data_path,
            &managed_workspace_path,
            &system_locale,
        )
        .err()
        .map(|error| format!("init rust error: {error}")),
    });
    if result.app_data_path != app_data_path {
        return Err(anyhow!("Rust 已使用其他 app data path 初始化"));
    }
    if result.managed_workspace_path != managed_workspace_path {
        return Err(anyhow!("Rust 已使用其他 managed workspace path 初始化"));
    }
    if result.system_locale != system_locale {
        return Err(anyhow!("Rust 已使用其他 system locale 初始化"));
    }
    match &result.error {
        Some(error) => Err(anyhow!(error.clone())),
        None => Ok(()),
    }
}

fn initialize_native_runtime_once(
    module_id: usize,
    app_data_path: &Path,
    managed_workspace_path: &Path,
    system_locale: &str,
) -> Result<()> {
    init_native_logger(module_id)?;
    let app_paths = lonanote_core::config::app_path::resolve_default_paths(app_data_path);
    lonanote_core::config::app_path::init_paths(app_paths);
    lonanote_core::config::system_locale::init_system_locale(system_locale);

    let provider_id = StorageProviderId::parse(APP_LOCAL_PROVIDER_ID)?;
    let resolver = Arc::new(
        LocalFsResolver::new().with_managed_provider(provider_id.clone(), managed_workspace_path),
    ) as Arc<dyn WorkspaceStorageResolver>;
    let manager = runtime()?.block_on(WorkspaceManager::load(app_data_path, resolver))?;
    runtime()?.block_on(manager.create_initial_workspace_if_needed(provider_id))?;
    install_workspace_manager(manager).map_err(|error| anyhow!(error.to_string()))?;
    lonanote_core::init()?;
    Ok(())
}

fn validate_native_storage_paths(
    module_data_path: &Path,
    app_data_path: &Path,
    managed_workspace_path: &Path,
) -> Result<()> {
    #[cfg(target_os = "android")]
    {
        if app_data_path != module_data_path {
            return Err(anyhow!(
                "Android app data path 必须等于原生模块内部数据目录"
            ));
        }
        let package_name = module_data_path
            .parent()
            .and_then(Path::file_name)
            .ok_or_else(|| anyhow!("无法从 Android 内部数据目录解析包名"))?;
        let expected_suffix = PathBuf::from("Android")
            .join("data")
            .join(package_name)
            .join("files");
        if !managed_workspace_path.ends_with(&expected_suffix) {
            return Err(anyhow!(
                "Android managed workspace path 必须位于应用的外部专属 files 目录"
            ));
        }
    }

    #[cfg(target_os = "ios")]
    {
        let container_path = module_data_path
            .parent()
            .ok_or_else(|| anyhow!("无法解析 iOS App Container"))?;
        if !app_data_path.starts_with(container_path)
            || !managed_workspace_path.starts_with(container_path)
        {
            return Err(anyhow!("iOS 存储路径必须位于当前 App Container 内"));
        }
    }

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let _ = (module_data_path, app_data_path, managed_workspace_path);

    Ok(())
}

struct NativeRustLogger {
    module_id: usize,
}

fn third_party_log_filter() -> LevelFilter {
    if cfg!(debug_assertions) {
        LevelFilter::Info
    } else {
        LevelFilter::Error
    }
}

fn target_matches_module(target: &str, module: &str) -> bool {
    target == module
        || target
            .strip_prefix(module)
            .is_some_and(|suffix| suffix.starts_with("::"))
}

fn level_for_target(target: &str) -> LevelFilter {
    if LOG_THIRD_LIST
        .iter()
        .any(|module| target_matches_module(target, module))
    {
        third_party_log_filter()
    } else {
        LevelFilter::Info
    }
}

impl Log for NativeRustLogger {
    fn enabled(&self, metadata: &Metadata<'_>) -> bool {
        metadata.level() <= level_for_target(metadata.target())
    }

    fn log(&self, record: &Record<'_>) {
        if self.enabled(record.metadata()) {
            emit_rust_log(
                self.module_id,
                record.level().to_string(),
                record.target().to_string(),
                record.args().to_string(),
            );
        }
    }

    fn flush(&self) {}
}

fn init_native_logger(module_id: usize) -> Result<()> {
    match NATIVE_LOGGER_INIT_RESULT.get_or_init(|| {
        let logger = NATIVE_LOGGER.get_or_init(|| NativeRustLogger { module_id });
        if logger.module_id != module_id {
            return Err("Rust logger 已绑定到其他原生模块实例".to_string());
        }
        log::set_logger(logger)
            .map(|()| log::set_max_level(LevelFilter::Trace))
            .map_err(|error| format!("初始化移动端 Rust logger 失败: {error}"))
    }) {
        Ok(()) => Ok(()),
        Err(error) => Err(anyhow!(error.clone())),
    }
}

fn ensure_init() -> Result<()> {
    match INIT_RESULT.get() {
        Some(InitResult {
            error: Some(error), ..
        }) => Err(anyhow!(error.clone())),
        Some(InitResult { error: None, .. }) => Ok(()),
        None => Err(anyhow!("Rust 尚未初始化")),
    }
}

fn runtime() -> Result<&'static Runtime> {
    match RUNTIME_RESULT.get_or_init(|| {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .map_err(|err| err.to_string())
    }) {
        Ok(runtime) => Ok(runtime),
        Err(err) => Err(anyhow!(err.clone())),
    }
}

fn pending_callbacks() -> &'static Mutex<HashMap<String, CallbackSender>> {
    PENDING_CALLBACKS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn parse_invoke_result(res: CommandResult) -> Result<Nullable<String>> {
    match res? {
        CommandResponse::Json(json) => Ok(Nullable::some(json)),
        CommandResponse::None => Ok(Nullable::none()),
    }
}

fn context_from_args(args: &Nullable<String>) -> CommandContext<'_> {
    CommandContext::from_string(args.value_of())
}

fn unwrap_or_throw<T>(res: Result<T>) -> T {
    match res {
        Ok(value) => value,
        Err(err) => throw!("{err}"),
    }
}

fn emit_callback_request(module_id: usize, id: String, key: String, args: Option<String>) {
    let signal = Box::new(LonanoteRustModuleSignal::OnCallbackRequest(
        CallbackRequest {
            id,
            key,
            args: Nullable::new(args).into(),
        },
    ));
    let signal_ptr = Box::into_raw(signal);
    let manager = crate::ffi::bridging::get_signal_manager();
    unsafe {
        manager.emit(module_id, "onCallbackRequest", signal_ptr);
    }
}

fn emit_rust_log(module_id: usize, level: String, target: String, message: String) {
    let signal = Box::new(LonanoteRustModuleSignal::OnRustLog(RustLogEntry {
        level,
        target,
        message,
    }));
    let signal_ptr = Box::into_raw(signal);
    let manager = crate::ffi::bridging::get_signal_manager();
    unsafe {
        manager.emit(module_id, "onRustLog", signal_ptr);
    }
}

#[cfg(test)]
mod tests {
    use super::{level_for_target, target_matches_module, LevelFilter};

    #[test]
    fn matches_module_targets_without_matching_similar_names() {
        assert!(target_matches_module("ignore::walk", "ignore"));
        assert!(target_matches_module("globset", "globset"));
        assert!(!target_matches_module("ignore_extra", "ignore"));
    }

    #[test]
    fn applies_default_and_third_party_log_levels() {
        let third_party_level = if cfg!(debug_assertions) {
            LevelFilter::Info
        } else {
            LevelFilter::Error
        };

        assert_eq!(level_for_target("ignore::walk"), third_party_level);
        assert_eq!(level_for_target("globset"), third_party_level);
        assert_eq!(level_for_target("lonanote-core"), LevelFilter::Info);
    }
}

fn resolve_pending_callback(id: &str, result: Result<Option<String>, String>) {
    let sender = pending_callbacks()
        .lock()
        .ok()
        .and_then(|mut callbacks| callbacks.remove(id));
    if let Some(sender) = sender {
        let _ = sender.send(result);
    }
}

pub struct LonanoteRustModule {
    ctx: Context,
}

#[craby_module]
impl LonanoteRustModuleSpec for LonanoteRustModule {
    fn init(
        &mut self,
        app_data_path: &str,
        managed_workspace_path: &str,
        system_locale: &str,
    ) -> Void {
        unwrap_or_throw(initialize_native_runtime(
            self.id(),
            &self.ctx.data_path,
            app_data_path,
            managed_workspace_path,
            system_locale,
        ))
    }

    fn invoke(&mut self, command: &str, args: Nullable<String>) -> Nullable<String> {
        unwrap_or_throw((|| {
            ensure_init()?;
            parse_invoke_result(invoke_command(command, context_from_args(&args)))
        })())
    }

    fn get_command_keys(&mut self) -> Array<String> {
        unwrap_or_throw((|| {
            ensure_init()?;
            lonanote_core::get_command_keys()
        })())
    }

    fn get_command_length(&mut self) -> Number {
        unwrap_or_throw((|| {
            ensure_init()?;
            Ok(lonanote_core::get_command_len()? as Number)
        })())
    }

    fn invoke_async(&mut self, command: &str, args: Nullable<String>) -> Promise<Nullable<String>> {
        ensure_init()?;
        let res = runtime()?.block_on(invoke_command_async(command, context_from_args(&args)));
        parse_invoke_result(res)
    }

    fn get_command_async_keys(&mut self) -> Array<String> {
        unwrap_or_throw((|| {
            ensure_init()?;
            lonanote_core::get_command_async_keys()
        })())
    }

    fn get_command_async_length(&mut self) -> Number {
        unwrap_or_throw((|| {
            ensure_init()?;
            Ok(lonanote_core::get_command_async_len()? as Number)
        })())
    }

    fn reg_callback_function(&mut self, key: &str) -> Promise<Void> {
        ensure_init()?;
        let module_id = self.id();
        let callback_key = key.to_string();
        let registered_key = callback_key.clone();
        let wrapped_fn =
            move |args: Option<String>| -> lonanote_core::CommandHandlerValueCallbackResult {
                let module_id = module_id;
                let key = callback_key.clone();
                Box::pin(async move {
                    let id = format!("{}:{}", key, CALLBACK_ID.fetch_add(1, Ordering::Relaxed));
                    let (sender, receiver) = oneshot::channel();
                    pending_callbacks()
                        .lock()
                        .map_err(|_| anyhow!("callback map lock poisoned"))?
                        .insert(id.clone(), sender);
                    emit_callback_request(module_id, id.clone(), key, args);
                    match receiver.await? {
                        Ok(result) => Ok(result),
                        Err(err) => Err(anyhow!(err)),
                    }
                })
            };

        lonanote_core::reg_command_callback(registered_key, Box::new(wrapped_fn))?;
        Ok(())
    }

    fn unreg_callback_function(&mut self, key: &str) -> Promise<Void> {
        ensure_init()?;
        lonanote_core::unreg_command_callback(&key.to_string())?;
        Ok(())
    }

    fn clear_callback_function(&mut self) -> Promise<Void> {
        ensure_init()?;
        lonanote_core::clear_command_callback()?;
        Ok(())
    }

    fn get_command_callback_keys(&mut self) -> Array<String> {
        unwrap_or_throw((|| {
            ensure_init()?;
            lonanote_core::get_command_callback_keys()
        })())
    }

    fn get_command_callback_length(&mut self) -> Number {
        unwrap_or_throw((|| {
            ensure_init()?;
            Ok(lonanote_core::get_command_callback_len()? as Number)
        })())
    }

    fn resolve_callback(&mut self, id: &str, result: Nullable<String>) -> Void {
        resolve_pending_callback(id, Ok(result.into_value()));
    }

    fn reject_callback(&mut self, id: &str, error: &str) -> Void {
        resolve_pending_callback(id, Err(error.to_string()));
    }
}

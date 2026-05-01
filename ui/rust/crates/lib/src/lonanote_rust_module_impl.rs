use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex, OnceLock,
    },
};

use anyhow::{anyhow, Result};
use craby::{prelude::*, throw};
use lonanote_core::{
    invoke_command, invoke_command_async, CommandContext, CommandResponse, CommandResult,
};
use tokio::{runtime::Runtime, sync::oneshot};

use crate::ffi::bridging::*;
use crate::generated::*;

type CallbackSender = oneshot::Sender<Result<Option<String>, String>>;

static INIT_RESULT: OnceLock<Option<String>> = OnceLock::new();
static RUNTIME_RESULT: OnceLock<Result<Runtime, String>> = OnceLock::new();
static CALLBACK_ID: AtomicU64 = AtomicU64::new(1);
static PENDING_CALLBACKS: OnceLock<Mutex<HashMap<String, CallbackSender>>> = OnceLock::new();

fn init_error() -> &'static Option<String> {
    INIT_RESULT.get_or_init(|| {
        lonanote_core::init()
            .err()
            .map(|err| format!("init rust error: {err}"))
    })
}

fn ensure_init() -> Result<()> {
    match init_error() {
        Some(err) => Err(anyhow!(err.clone())),
        None => Ok(()),
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
    fn init(&mut self) -> Nullable<String> {
        match init_error() {
            Some(err) => Nullable::some(err.clone()),
            None => Nullable::none(),
        }
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

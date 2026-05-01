use std::collections::HashMap;

use serde_json::Value;
use tauri::{
    command,
    plugin::{Builder, TauriPlugin},
    Error, Runtime,
};

use super::store_impl as store;

#[command]
fn file_path(store_key: &str) -> Result<String, Error> {
    let s = store::get_store(store_key)?;
    Ok(s.file_path().to_str().unwrap().to_string())
}
#[command]
fn file_name(store_key: &str) -> Result<String, Error> {
    let s = store::get_store(store_key)?;
    Ok(s.file_name().clone())
}
#[command]
fn reload(store_key: &str) -> Result<(), Error> {
    let mut s = store::get_store_mut(store_key)?;
    Ok(s.reload()?)
}
#[command]
fn save(store_key: &str) -> Result<(), Error> {
    let s = store::get_store(store_key)?;
    Ok(s.save()?)
}
#[command]
fn clear(store_key: &str) -> Result<(), Error> {
    let mut s = store::get_store_mut(store_key)?;
    let _: () = s.clear();
    Ok(())
}
#[command]
fn delete(store_key: &str, key: &str) -> Result<bool, Error> {
    let mut s = store::get_store_mut(store_key)?;
    Ok(s.delete(key))
}
#[command]
fn has(store_key: &str, key: &str) -> Result<bool, Error> {
    let s = store::get_store(store_key)?;
    Ok(s.has(key))
}
#[command]
fn get(store_key: &str, key: &str) -> Result<Option<Value>, Error> {
    let s = store::get_store(store_key)?;
    Ok(s.get(key))
}
#[command]
fn set(store_key: &str, key: &str, val: Value) -> Result<(), Error> {
    let mut s = store::get_store_mut(store_key)?;
    let _: () = s.set(key, &val);
    Ok(())
}
#[command]
fn keys(store_key: &str) -> Result<Vec<String>, Error> {
    let s = store::get_store(store_key)?;
    let keys = s.keys().map(|k| k.to_string()).collect::<Vec<String>>();
    Ok(keys)
}
#[command]
fn values(store_key: &str) -> Result<Vec<Value>, Error> {
    let s = store::get_store(store_key)?;
    let values = s.values().cloned().collect::<Vec<Value>>();
    Ok(values)
}
#[command]
fn len(store_key: &str) -> Result<usize, Error> {
    let s = store::get_store(store_key)?;
    Ok(s.len())
}
#[command]
fn is_empty(store_key: &str) -> Result<bool, Error> {
    let s = store::get_store(store_key)?;
    Ok(s.is_empty())
}
#[command]
fn all(store_key: &str) -> Result<HashMap<String, Value>, Error> {
    let s = store::get_store(store_key)?;
    Ok(s.all())
}

pub(crate) fn init_plugin<R: Runtime>() -> anyhow::Result<TauriPlugin<R>> {
    Ok(Builder::new("store")
        .invoke_handler(tauri::generate_handler![
            file_path, file_name, reload, save, clear, delete, has, get, set, keys, values, len,
            is_empty, all
        ])
        .build())
}

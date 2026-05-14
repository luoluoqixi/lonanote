use anyhow::Result;
use cmdreg::command;
use serde_json::Value;
use std::collections::HashMap;

use super::store_impl as store;

#[command("store")]
pub fn file_path(store_key: String) -> Result<String> {
    let s = store::get_store(&store_key)?;
    Ok(s.file_path().to_str().unwrap().to_string())
}
#[command("store")]
pub fn file_name(store_key: String) -> Result<String> {
    let s = store::get_store(&store_key)?;
    Ok(s.file_name().clone())
}
#[command("store")]
pub fn reload(store_key: String) -> Result<()> {
    let mut s = store::get_store_mut(&store_key)?;
    s.reload()
}
#[command("store")]
pub fn save(store_key: String) -> Result<()> {
    let s = store::get_store(&store_key)?;
    s.save()
}
#[command("store")]
pub fn clear(store_key: String) -> Result<()> {
    let mut s = store::get_store_mut(&store_key)?;
    let _: () = s.clear();
    Ok(())
}
#[command("store")]
pub fn delete(store_key: String, key: String) -> Result<bool> {
    let mut s = store::get_store_mut(&store_key)?;
    Ok(s.delete(key))
}
#[command("store")]
pub fn has(store_key: String, key: String) -> Result<bool> {
    let s = store::get_store(&store_key)?;
    Ok(s.has(key))
}
#[command("store")]
pub fn get(store_key: String, key: String) -> Result<Option<Value>> {
    let s = store::get_store(&store_key)?;
    Ok(s.get(key))
}
#[command("store")]
pub fn set(store_key: String, key: String, val: Value) -> Result<()> {
    let mut s = store::get_store_mut(&store_key)?;
    let _: () = s.set(key, &val);
    Ok(())
}
#[command("store")]
pub fn keys(store_key: String) -> Result<Vec<String>> {
    let s = store::get_store(&store_key)?;
    let keys = s.keys().map(|k| k.to_string()).collect::<Vec<String>>();
    Ok(keys)
}
#[command("store")]
pub fn values(store_key: String) -> Result<Vec<Value>> {
    let s = store::get_store(&store_key)?;
    let values = s.values().cloned().collect::<Vec<Value>>();
    Ok(values)
}
#[command("store")]
pub fn len(store_key: String) -> Result<usize> {
    let s = store::get_store(&store_key)?;
    Ok(s.len())
}
#[command("store")]
pub fn is_empty(store_key: String) -> Result<bool> {
    let s = store::get_store(&store_key)?;
    Ok(s.is_empty())
}
#[command("store")]
pub fn all(store_key: String) -> Result<HashMap<String, Value>> {
    let s = store::get_store(&store_key)?;
    Ok(s.all())
}

#[command("store")]
pub fn common_file_path() -> Result<String> {
    let s = store::common()?;
    Ok(s.file_path().to_str().unwrap().to_string())
}
#[command("store")]
pub fn common_file_name() -> Result<String> {
    let s = store::common()?;

    Ok(s.file_name().clone())
}
#[command("store")]
pub fn common_reload() -> Result<()> {
    let mut s = store::common_mut()?;
    s.reload()
}
#[command("store")]
pub fn common_save() -> Result<()> {
    let s = store::common()?;
    s.save()
}
#[command("store")]
pub fn common_clear() -> Result<()> {
    let mut s = store::common_mut()?;
    let _: () = s.clear();
    Ok(())
}
#[command("store")]
pub fn common_delete(key: String) -> Result<bool> {
    let mut s = store::common_mut()?;
    Ok(s.delete(key))
}
#[command("store")]
pub fn common_has(key: String) -> Result<bool> {
    let s = store::common()?;
    Ok(s.has(key))
}
#[command("store")]
pub fn common_get(key: String) -> Result<Option<Value>> {
    let s = store::common()?;
    Ok(s.get(key))
}
#[command("store")]
pub fn common_set(key: String, val: Value) -> Result<()> {
    let mut s = store::common_mut()?;
    let _: () = s.set(key, &val);
    Ok(())
}
#[command("store")]
pub fn common_keys() -> Result<Vec<String>> {
    let s = store::common()?;
    let keys = s.keys().map(|k| k.to_string()).collect::<Vec<String>>();
    Ok(keys)
}
#[command("store")]
pub fn common_values() -> Result<Vec<Value>> {
    let s = store::common()?;
    let values = s.values().cloned().collect::<Vec<Value>>();
    Ok(values)
}
#[command("store")]
pub fn common_len() -> Result<usize> {
    let s = store::common()?;
    Ok(s.len())
}
#[command("store")]
pub fn common_is_empty() -> Result<bool> {
    let s = store::common()?;
    Ok(s.is_empty())
}
#[command("store")]
pub fn common_all() -> Result<HashMap<String, Value>> {
    let s = store::common()?;
    Ok(s.all())
}

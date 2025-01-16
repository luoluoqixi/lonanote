use std::{collections::HashMap, ops::Deref};

#[derive(Debug, Default)]
pub struct Commands<K, F> {
    commands: HashMap<K, F>,
}
impl<K, F> Commands<K, F>
where
    K: Eq + std::hash::Hash + AsRef<str>,
{
    pub fn new() -> Self {
        Self {
            commands: Default::default(),
        }
    }
    pub fn reg(&mut self, command: K, f: F) {
        self.commands.insert(command, f);
    }
    pub fn unreg(&mut self, command: &K) {
        if self.commands.contains_key(command) {
            self.commands.remove(command);
        }
    }
    pub fn clear(&mut self) {
        self.commands.clear();
    }
    pub fn get(&self, key: &K) -> Option<&F> {
        self.commands.get(key)
    }
    pub fn len(&self) -> usize {
        self.commands.len()
    }
    pub fn is_empty(&self) -> bool {
        self.commands.is_empty()
    }
    pub fn get_keys(&self) -> Vec<String> {
        self.commands
            .keys()
            .map(|k| k.as_ref().to_string())
            .collect::<Vec<String>>()
    }
}

impl<K, F> Deref for Commands<K, F> {
    type Target = HashMap<K, F>;
    fn deref(&self) -> &Self::Target {
        &self.commands
    }
}

mod commands_async;
mod commands_js;
mod commands_sync;

pub use commands_async::*;
pub use commands_js::*;
pub use commands_sync::*;

use std::{path::PathBuf, process::Command};

pub fn test(hello: String) -> String {
    format!("{} world", hello)
}

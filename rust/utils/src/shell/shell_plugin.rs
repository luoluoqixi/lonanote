use cmdreg::command;

use super::shell_impl;

#[command("shell")]
fn show_in_folder(path: String) {
    shell_impl::show_in_folder(path);
}

#[command("shell")]
fn open_folder(path: String) {
    shell_impl::open_folder(path);
}

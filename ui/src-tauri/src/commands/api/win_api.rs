use cmdreg::command;

use crate::utils;

#[command("win")]
fn set_bg_color(color: String) -> bool {
    if let Some(main_window) = utils::win::get_main_window() {
        utils::win::set_win_bg_hex(&main_window, &color).is_ok()
    } else {
        false
    }
}

#[command("win")]
fn set_window_bg_color(label: String, color: String) -> bool {
    if let Some(window) = utils::win::get_window(&label) {
        utils::win::set_win_bg_hex(&window, &color).is_ok()
    } else {
        false
    }
}

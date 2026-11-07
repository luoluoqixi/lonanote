use crate::setup::system_fonts::{self, FamilyEntry, ResolvedFont};
use lonanote_core::FontSelection;

#[tauri::command]
pub async fn list_system_fonts(refresh: bool) -> Result<Vec<FamilyEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || system_fonts::list(refresh))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn resolve_system_font(
    selection: FontSelection,
    consumer: String,
) -> Result<ResolvedFont, String> {
    tauri::async_runtime::spawn_blocking(move || system_fonts::resolve(&selection, &consumer))
        .await
        .map_err(|e| e.to_string())?
}

use font_kit::{
    family_name::FamilyName,
    properties::{Properties, Style, Weight},
    source::SystemSource,
};
use lonanote_core::{FontPlatform, FontSelection};
use serde::Serialize;
use std::{
    collections::BTreeSet,
    sync::{LazyLock, Mutex},
};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Capability {
    available: bool,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FamilyEntry {
    #[serde(flatten)]
    selection: FontSelection,
    ui: Capability,
    editor: Capability,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedFont {
    family: String,
    faces: Vec<Face>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Face {
    family: String,
    weight: u16,
    italic: bool,
    source: LocalSource,
}
#[derive(Serialize)]
struct LocalSource {
    kind: &'static str,
    name: String,
}

static CATALOG: LazyLock<Mutex<Option<Vec<FamilyEntry>>>> = LazyLock::new(|| Mutex::new(None));

fn platform() -> FontPlatform {
    if cfg!(target_os = "windows") {
        FontPlatform::Windows
    } else if cfg!(target_os = "macos") {
        FontPlatform::Macos
    } else {
        FontPlatform::Linux
    }
}

pub fn list(refresh: bool) -> Result<Vec<FamilyEntry>, String> {
    let mut cached = CATALOG.lock().map_err(|_| "字体目录锁不可用")?;
    if !refresh {
        if let Some(entries) = &*cached {
            return Ok(entries.clone());
        }
    }
    let names = SystemSource::new()
        .all_families()
        .map_err(|e| format!("读取系统字体失败：{e}"))?;
    let entries: Vec<_> = names
        .into_iter()
        .filter(|name| !name.starts_with('@') && !name.trim().is_empty())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .filter(|name| {
            // 图标/符号字体不作为正文候选，不改变系统的缺字 fallback。
            let lower = name.to_lowercase();
            !["emoji", "wingdings", "webdings", "symbol", "icon", "mdl2"]
                .iter()
                .any(|part| lower.contains(part))
        })
        .map(|name| FamilyEntry {
            selection: FontSelection {
                platform: platform(),
                family_key: name.clone(),
                display_name: name,
            },
            ui: Capability { available: true },
            editor: Capability { available: true },
        })
        .collect();
    *cached = Some(entries.clone());
    Ok(entries)
}

pub fn resolve(selection: &FontSelection, consumer: &str) -> Result<ResolvedFont, String> {
    if selection.platform != platform() || !matches!(consumer, "ui" | "editor") {
        return Err("字体平台或使用位置无效".into());
    }
    if !list(false)?
        .iter()
        .any(|entry| entry.selection.family_key == selection.family_key)
    {
        return Err("当前字体不可用，已使用系统默认".into());
    }
    let source = SystemSource::new();
    let family = &selection.family_key;
    let mut faces = Vec::new();
    for (weight, italic) in [(400, false), (700, false), (400, true), (700, true)] {
        let properties = Properties {
            weight: Weight(weight as f32),
            style: if italic { Style::Italic } else { Style::Normal },
            ..Properties::new()
        };
        let handle = source
            .select_best_match(&[FamilyName::Title(family.clone())], &properties)
            .map_err(|e| e.to_string())?;
        let font = handle.load().map_err(|e| e.to_string())?;
        let Some(name) = font.postscript_name() else {
            continue;
        };
        let actual = font.properties();
        // 不把不存在的粗体/斜体重复映射到常规 face，让浏览器执行正常的合成和 fallback。
        let actual_weight = actual.weight.0 as u16;
        let actual_italic = actual.style != Style::Normal;
        if faces.iter().any(|face: &Face| face.source.name == name) {
            continue;
        }
        faces.push(Face {
            family: family.clone(),
            weight: actual_weight,
            italic: actual_italic,
            source: LocalSource {
                kind: "local",
                name,
            },
        });
    }
    if faces.is_empty() {
        return Err("此字体没有可加载的本地字体名称".into());
    }
    Ok(ResolvedFont {
        family: family.clone(),
        faces,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unknown_identity_and_paths_cannot_resolve_fonts() {
        for key in [
            "../../settings.json",
            "C:\\Windows\\win.ini",
            "font-that-does-not-exist",
        ] {
            let selection = FontSelection {
                platform: platform(),
                family_key: key.into(),
                display_name: key.into(),
            };
            assert!(resolve(&selection, "editor").is_err());
        }
    }
    #[test]
    fn catalog_families_are_unique_and_resolvable() {
        let entries = list(false).unwrap();
        assert!(!entries.is_empty());
        assert_eq!(
            entries.len(),
            entries
                .iter()
                .map(|e| &e.selection.family_key)
                .collect::<BTreeSet<_>>()
                .len()
        );
        assert!(entries
            .iter()
            .any(|e| resolve(&e.selection, "editor").is_ok()));
    }
}

use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SystemFontSelection {
    pub platform: FontPlatform,
    pub family_key: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "source", rename_all = "lowercase")]
pub enum FontSelection {
    System { #[serde(flatten)] identity: SystemFontSelection },
    Bundled { #[serde(rename = "fontId")] font_id: BundledFontId },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BundledFontId {
    #[serde(rename = "fira-code")]
    FiraCode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FontPlatform {
    Windows,
    Macos,
    Linux,
    Android,
    Ios,
}

fn normalize(mut value: serde_json::Value) -> Option<FontSelection> {
    if let Some(object) = value.as_object_mut() {
        if !object.contains_key("source") {
            object.insert("source".into(), "system".into());
        }
    }
    let selection: FontSelection = serde_json::from_value(value).ok()?;
    if let FontSelection::System { identity } = &selection {
        if identity.family_key.trim().is_empty()
            || identity.family_key.chars().count() > 512
            || identity.display_name.trim().is_empty()
            || identity.display_name.chars().count() > 512 {
            return None;
        }
    }
    Some(selection)
}

pub fn deserialize_selection<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<FontSelection>, D::Error> {
    Ok(normalize(serde_json::Value::deserialize(deserializer)?))
}

/// 外层 Some 表示字段出现过，内层 None 表示用户恢复系统默认。
pub fn deserialize_patch<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<Option<FontSelection>>, D::Error> {
    Ok(Some(normalize(serde_json::Value::deserialize(
        deserializer,
    )?)))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn source_migration_and_bundled_whitelist() {
        let old = serde_json::json!({"platform":"windows","familyKey":"Fira Code","displayName":"Fira Code"});
        assert_eq!(serde_json::to_value(normalize(old).unwrap()).unwrap()["source"], "system");
        assert!(normalize(serde_json::json!({"source":"bundled","fontId":"fira-code"})).is_some());
        assert!(normalize(serde_json::json!({"source":"bundled","fontId":"../x"})).is_none());
    }
}

use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FontSelection {
    pub platform: FontPlatform,
    pub family_key: String,
    pub display_name: String,
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

fn normalize(value: serde_json::Value) -> Option<FontSelection> {
    let selection: FontSelection = serde_json::from_value(value).ok()?;
    if selection.family_key.trim().is_empty()
        || selection.family_key.chars().count() > 512
        || selection.display_name.trim().is_empty()
        || selection.display_name.chars().count() > 512
    {
        return None;
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

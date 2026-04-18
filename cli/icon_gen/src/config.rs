use std::{path::PathBuf, sync::LazyLock};

pub static CURRENT_PATH: LazyLock<PathBuf> = LazyLock::new(|| {
    std::env::current_exe()
        .unwrap()
        .parent()
        .unwrap() // /release
        .parent()
        .unwrap() // /target
        .parent()
        .unwrap() // /cli
        .to_path_buf()
});

pub static REPO_PATH: LazyLock<PathBuf> = LazyLock::new(|| CURRENT_PATH.join(".."));

pub static ICON_CONFIG_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| CURRENT_PATH.join("icon_gen/config/icon_config.toml"));

pub static ICON_CONFIG: LazyLock<IconConfig> = LazyLock::new(|| {
    let content = std::fs::read_to_string(ICON_CONFIG_PATH.as_path()).unwrap();
    toml::from_str(&content).unwrap()
});

#[derive(Debug, Clone, serde::Deserialize)]
pub struct IconConfig {
    pub common: CommonConf,
    pub icons: Vec<Icon>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct CommonConf {
    pub icon: String,
    pub mask_path: Option<String>,
    pub custom_tauri_icon_folder: Option<String>,

    pub transform: Option<IconTransformConf>,
    pub transform_win: Option<IconTransformConf>,
    pub transform_mac: Option<IconTransformConf>,
    pub transform_linux: Option<IconTransformConf>,
    pub transform_android: Option<IconTransformConf>,
    pub transform_ios: Option<IconTransformConf>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct IconTransformConf {
    pub default_mask: Option<bool>,
    pub custom_mask: Option<String>,
    pub blank_size: Option<u32>,
    pub resize: Option<IconSize>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct IconSize {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub struct Icon {
    #[serde(rename = "type")]
    pub r#type: GenerateIconType,
    pub name: String,
    pub output_path: String,
    pub project_path: Option<String>,

    pub transform: Option<IconTransformConf>,
    pub transform_win: Option<IconTransformConf>,
    pub transform_mac: Option<IconTransformConf>,
    pub transform_linux: Option<IconTransformConf>,
    pub transform_android: Option<IconTransformConf>,
    pub transform_ios: Option<IconTransformConf>,
}

#[derive(Debug, Clone, serde::Deserialize)]
pub enum GenerateIconType {
    #[serde(rename = "flutter")]
    Flutter,
    #[serde(rename = "tauri")]
    Tauri,
    #[serde(rename = "custom")]
    Custom,
}

impl Icon {
    #[allow(clippy::type_complexity)]
    pub fn get_transform<'a>(
        &'a self,
        common: &'a CommonConf,
    ) -> (
        Option<&'a IconTransformConf>,
        Option<&'a IconTransformConf>,
        Option<&'a IconTransformConf>,
        Option<&'a IconTransformConf>,
        Option<&'a IconTransformConf>,
        Option<&'a IconTransformConf>,
    ) {
        fn resolve_transform<'a>(
            transform: &'a Option<IconTransformConf>,
            default_transform: &'a Option<IconTransformConf>,
        ) -> Option<&'a IconTransformConf> {
            if let Some(transform) = transform {
                Some(transform)
            } else {
                default_transform.as_ref()
            }
        }

        let transform = resolve_transform(&self.transform, &common.transform);
        let transform_win = resolve_transform(&self.transform_win, &common.transform_win);
        let transform_mac = resolve_transform(&self.transform_mac, &common.transform_mac);
        let transform_linux = resolve_transform(&self.transform_linux, &common.transform_linux);
        let transform_android =
            resolve_transform(&self.transform_android, &common.transform_android);
        let transform_ios = resolve_transform(&self.transform_ios, &common.transform_ios);

        (
            transform,
            transform_win,
            transform_mac,
            transform_linux,
            transform_android,
            transform_ios,
        )
    }
}

pub struct IcnsConf {
    pub name: String,
    pub size: u32,
    pub ostype: String,
}

pub static ICNS_CONF: LazyLock<Vec<IcnsConf>> = LazyLock::new(|| {
    vec![
        IcnsConf {
            name: "16x16".to_string(),
            size: 16,
            ostype: "is32".to_string(),
        },
        IcnsConf {
            name: "16x16@2x".to_string(),
            size: 32,
            ostype: "ic11".to_string(),
        },
        IcnsConf {
            name: "32x32".to_string(),
            size: 32,
            ostype: "il32".to_string(),
        },
        IcnsConf {
            name: "32x32@2x".to_string(),
            size: 64,
            ostype: "ic12".to_string(),
        },
        IcnsConf {
            name: "128x128".to_string(),
            size: 128,
            ostype: "ic07".to_string(),
        },
        IcnsConf {
            name: "128x128@2x".to_string(),
            size: 256,
            ostype: "ic13".to_string(),
        },
        IcnsConf {
            name: "256x256".to_string(),
            size: 256,
            ostype: "ic08".to_string(),
        },
        IcnsConf {
            name: "256x256@2x".to_string(),
            size: 512,
            ostype: "ic14".to_string(),
        },
        IcnsConf {
            name: "512x512".to_string(),
            size: 512,
            ostype: "ic09".to_string(),
        },
        IcnsConf {
            name: "512x512@2x".to_string(),
            size: 1024,
            ostype: "ic10".to_string(),
        },
    ]
});

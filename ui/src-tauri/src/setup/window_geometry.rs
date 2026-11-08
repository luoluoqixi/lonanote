use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

use crate::common::consts::{DEFAULT_WINDOW_INIT_HEIGHT, DEFAULT_WINDOW_INIT_WIDTH};

pub fn geometry_migration(
    values: &HashMap<String, Value>,
    scale: f64,
) -> (HashMap<String, Value>, Vec<String>) {
    let mut set = HashMap::new();
    let mut remove = Vec::new();
    if let Some(old) = values.get("ui.window.lastState") {
        if !values.contains_key("ui.window.lastSize") {
            let size = serde_json::from_value::<WindowSize>(old.clone()).ok();
            if let Some(size) = size.filter(|size| size.is_valid()) {
                let scale = if scale.is_finite() && scale > 0.0 {
                    scale
                } else {
                    1.0
                };
                set.insert("ui.window.lastSize".to_string(), serde_json::json!({ "width": size.width / scale, "height": size.height / scale }));
            }
        }
        remove.push("ui.window.lastState".to_string());
    }
    if let Some(old) = values.get("ui.window.restoreWindowState") {
        if !values.contains_key("ui.window.rememberSize") {
            set.insert(
                "ui.window.rememberSize".to_string(),
                Value::Bool(old.as_bool().unwrap_or(true)),
            );
        }
        remove.push("ui.window.restoreWindowState".to_string());
    }
    (set, remove)
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize, Serialize)]
pub struct WindowSize {
    pub width: f64,
    pub height: f64,
}

impl WindowSize {
    pub fn is_valid(self) -> bool {
        self.width.is_finite() && self.height.is_finite() && self.width > 0.0 && self.height > 0.0
    }
}

#[derive(Clone, Copy)]
pub struct WorkArea {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub scale: f64,
}

#[derive(Debug, PartialEq)]
pub struct Geometry {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub fn resolve_geometry(size: Option<WindowSize>, area: WorkArea) -> Geometry {
    let size = size.filter(|size| size.is_valid()).unwrap_or(WindowSize {
        width: DEFAULT_WINDOW_INIT_WIDTH,
        height: DEFAULT_WINDOW_INIT_HEIGHT,
    });
    let scale = if area.scale.is_finite() && area.scale > 0.0 {
        area.scale
    } else {
        1.0
    };
    let available_width = (area.width / scale).max(1.0);
    let available_height = (area.height / scale).max(1.0);
    let width = size.width.min(available_width);
    let height = size.height.min(available_height);
    Geometry {
        x: area.x / scale + (available_width - width) / 2.0,
        y: area.y / scale + (available_height - height) / 2.0,
        width,
        height,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn center_uses_target_monitor_work_area() {
        let geometry = resolve_geometry(
            None,
            WorkArea {
                x: 100.0,
                y: 40.0,
                width: 1920.0,
                height: 1040.0,
                scale: 1.0,
            },
        );
        assert_eq!(
            geometry,
            Geometry {
                x: 460.0,
                y: 210.0,
                width: 1200.0,
                height: 700.0
            }
        );
    }

    #[test]
    fn clamps_size_to_work_area() {
        let geometry = resolve_geometry(
            Some(WindowSize {
                width: 3000.0,
                height: 2000.0,
            }),
            WorkArea {
                x: 0.0,
                y: 0.0,
                width: 800.0,
                height: 500.0,
                scale: 1.0,
            },
        );
        assert_eq!(
            geometry,
            Geometry {
                x: 0.0,
                y: 0.0,
                width: 800.0,
                height: 500.0
            }
        );
    }

    #[test]
    fn supports_negative_monitor_origin_and_dpi_scale() {
        let geometry = resolve_geometry(
            Some(WindowSize {
                width: 800.0,
                height: 600.0,
            }),
            WorkArea {
                x: -2560.0,
                y: -200.0,
                width: 2560.0,
                height: 1400.0,
                scale: 2.0,
            },
        );
        assert_eq!(
            geometry,
            Geometry {
                x: -1040.0,
                y: -50.0,
                width: 800.0,
                height: 600.0
            }
        );
    }

    #[test]
    fn invalid_saved_size_uses_default() {
        let area = WorkArea {
            x: 0.0,
            y: 0.0,
            width: 1920.0,
            height: 1080.0,
            scale: 1.0,
        };
        for size in [
            WindowSize {
                width: f64::NAN,
                height: 600.0,
            },
            WindowSize {
                width: 800.0,
                height: -1.0,
            },
        ] {
            let geometry = resolve_geometry(Some(size), area);
            assert_eq!((geometry.width, geometry.height), (1200.0, 700.0));
        }
    }

    #[test]
    fn migrates_physical_size_without_position_or_flags() {
        let values = std::collections::HashMap::from([
            (
                "ui.window.lastState".to_string(),
                serde_json::json!({ "width": 1600, "height": 1200, "x": -2000, "y": 0, "isMaximized": true }),
            ),
            (
                "ui.window.restoreWindowState".to_string(),
                serde_json::json!(false),
            ),
        ]);
        let (set, remove) = geometry_migration(&values, 2.0);
        assert_eq!(
            set["ui.window.lastSize"],
            serde_json::json!({ "width": 800.0, "height": 600.0 })
        );
        assert_eq!(set["ui.window.rememberSize"], serde_json::json!(false));
        assert_eq!(remove.len(), 2);
    }

    #[test]
    fn migration_does_not_replace_new_size() {
        let values = std::collections::HashMap::from([
            (
                "ui.window.lastState".to_string(),
                serde_json::json!({ "width": 1600, "height": 1200 }),
            ),
            (
                "ui.window.lastSize".to_string(),
                serde_json::json!({ "width": 900, "height": 700 }),
            ),
        ]);
        let (set, remove) = geometry_migration(&values, 2.0);
        assert!(!set.contains_key("ui.window.lastSize"));
        assert_eq!(remove, vec!["ui.window.lastState"]);
    }
}

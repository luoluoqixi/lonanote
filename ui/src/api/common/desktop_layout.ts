export const DESKTOP_LAYOUT_STORAGE_KEY = "lonanote.wideScreenHome.layout";
export const DEFAULT_DESKTOP_LAYOUT = {
  sizes: [],
  visible: [true, true, true],
};

// 与 Tauri.toml、Tauri.macos.toml 中主窗口的默认逻辑尺寸保持一致。
export const DEFAULT_DESKTOP_WINDOW_SIZE = { width: 1024, height: 576 };

import { isDesktop, store } from "@/api/common";
import {
  type AccentThemeName,
  defaultAccentThemeName,
  normalizeAccentThemeName,
} from "@/theme/accent_themes";

export type ColorSchemeSetting = "light" | "dark" | "system";
export type AccentColorSetting = AccentThemeName;
export type AppLayoutMode = "mobile" | "desktop";

export interface DesktopWindowState {
  height: number;
  isFullscreen: boolean;
  isMaximized: boolean;
  width: number;
  x: number;
  y: number;
}

export interface UiPreferences {
  shell: {
    layoutMode: AppLayoutMode;
  };
  appearance: {
    accentColor: AccentColorSetting;
    backgroundFollowsTheme: boolean;
    themeMode: ColorSchemeSetting;
    zoomFactor: number;
  };
  window: {
    lastWindowState: DesktopWindowState | null;
    restoreWindowState: boolean;
  };
}

const UI_ACCENT_COLOR_KEY = "ui.appearance.accentColor";
const UI_BACKGROUND_FOLLOWS_THEME_KEY = "ui.appearance.backgroundFollowsTheme";
const UI_THEME_MODE_KEY = "ui.appearance.themeMode";
const UI_ZOOM_FACTOR_KEY = "ui.appearance.zoomFactor";
const UI_LAYOUT_MODE_KEY = "ui.shell.layoutMode";
const UI_WINDOW_LAST_STATE_KEY = "ui.window.lastState";
const UI_RESTORE_WINDOW_STATE_KEY = "ui.window.restoreWindowState";

export function createDefaultUiPreferences(): UiPreferences {
  return {
    shell: {
      layoutMode: isDesktop() ? "desktop" : "mobile",
    },
    appearance: {
      accentColor: defaultAccentThemeName,
      backgroundFollowsTheme: false,
      themeMode: "system",
      zoomFactor: 1,
    },
    window: {
      lastWindowState: null,
      restoreWindowState: true,
    },
  };
}

function normalizeAccentColor(value: unknown): AccentColorSetting {
  return normalizeAccentThemeName(value);
}

function normalizeThemeMode(value: unknown): ColorSchemeSetting {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function normalizeLayoutMode(value: unknown, fallback: AppLayoutMode): AppLayoutMode {
  if (value === "desktop" || value === "mobile") {
    return value;
  }

  if (value === "wide") {
    return "desktop";
  }

  if (value === "compact") {
    return "mobile";
  }

  return fallback;
}

function normalizeZoomFactor(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(2, Math.max(0.75, Number(value.toFixed(2))));
}

function normalizeDesktopWindowState(value: unknown): DesktopWindowState | null {
  if (value == null || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DesktopWindowState>;

  if (
    typeof candidate.width !== "number" ||
    typeof candidate.height !== "number" ||
    typeof candidate.x !== "number" ||
    typeof candidate.y !== "number" ||
    typeof candidate.isMaximized !== "boolean" ||
    typeof candidate.isFullscreen !== "boolean"
  ) {
    return null;
  }

  return {
    height: candidate.height,
    isFullscreen: candidate.isFullscreen,
    isMaximized: candidate.isMaximized,
    width: candidate.width,
    x: candidate.x,
    y: candidate.y,
  };
}

function normalizeUiPreferences(preferences: UiPreferences): UiPreferences {
  const defaults = createDefaultUiPreferences();

  return {
    shell: {
      layoutMode: normalizeLayoutMode(preferences.shell?.layoutMode, defaults.shell.layoutMode),
    },
    appearance: {
      accentColor: normalizeAccentColor(preferences.appearance.accentColor),
      backgroundFollowsTheme: Boolean(preferences.appearance.backgroundFollowsTheme),
      themeMode: normalizeThemeMode(preferences.appearance.themeMode),
      zoomFactor: normalizeZoomFactor(preferences.appearance.zoomFactor),
    },
    window: {
      lastWindowState: normalizeDesktopWindowState(preferences.window.lastWindowState),
      restoreWindowState: Boolean(preferences.window.restoreWindowState),
    },
  };
}

function readUiPreferencesFromStore(): UiPreferences {
  const defaults = createDefaultUiPreferences();
  const accentColor = store.commonGetSync<unknown>(UI_ACCENT_COLOR_KEY);
  const backgroundFollowsTheme = store.commonGetSync<unknown>(UI_BACKGROUND_FOLLOWS_THEME_KEY);
  const themeMode = store.commonGetSync<unknown>(UI_THEME_MODE_KEY);
  const zoomFactor = store.commonGetSync<unknown>(UI_ZOOM_FACTOR_KEY);
  const restoreWindowState = store.commonGetSync<unknown>(UI_RESTORE_WINDOW_STATE_KEY);
  const lastWindowState = store.commonGetSync<unknown>(UI_WINDOW_LAST_STATE_KEY);
  const layoutMode = store.commonGetSync<unknown>(UI_LAYOUT_MODE_KEY);

  return {
    shell: {
      layoutMode: normalizeLayoutMode(layoutMode, defaults.shell.layoutMode),
    },
    appearance: {
      accentColor: normalizeAccentColor(accentColor ?? defaults.appearance.accentColor),
      backgroundFollowsTheme:
        typeof backgroundFollowsTheme === "boolean"
          ? backgroundFollowsTheme
          : defaults.appearance.backgroundFollowsTheme,
      themeMode: normalizeThemeMode(themeMode ?? defaults.appearance.themeMode),
      zoomFactor: normalizeZoomFactor(zoomFactor ?? defaults.appearance.zoomFactor),
    },
    window: {
      lastWindowState: normalizeDesktopWindowState(lastWindowState),
      restoreWindowState:
        typeof restoreWindowState === "boolean"
          ? restoreWindowState
          : defaults.window.restoreWindowState,
    },
  };
}

function applyUiPreferencesToStore(preferences: UiPreferences): UiPreferences {
  const normalizedPreferences = normalizeUiPreferences(preferences);

  store.commonSetSync(UI_LAYOUT_MODE_KEY, normalizedPreferences.shell.layoutMode);
  store.commonSetSync(UI_ACCENT_COLOR_KEY, normalizedPreferences.appearance.accentColor);
  store.commonSetSync(
    UI_BACKGROUND_FOLLOWS_THEME_KEY,
    normalizedPreferences.appearance.backgroundFollowsTheme,
  );
  store.commonSetSync(UI_THEME_MODE_KEY, normalizedPreferences.appearance.themeMode);
  store.commonSetSync(UI_ZOOM_FACTOR_KEY, normalizedPreferences.appearance.zoomFactor);
  store.commonSetSync(UI_RESTORE_WINDOW_STATE_KEY, normalizedPreferences.window.restoreWindowState);
  store.commonSetSync(UI_WINDOW_LAST_STATE_KEY, normalizedPreferences.window.lastWindowState);

  return normalizedPreferences;
}

export const uiPreferences = {
  getPreferences: (): UiPreferences => {
    return readUiPreferencesFromStore();
  },
  reloadPreferences: (): UiPreferences => {
    store.commonReloadSync();
    return readUiPreferencesFromStore();
  },
  savePreferences: async (preferences: UiPreferences): Promise<UiPreferences> => {
    const normalizedPreferences = applyUiPreferencesToStore(preferences);
    await store.commonSave();
    return normalizedPreferences;
  },
  saveDesktopWindowState: async (windowState: DesktopWindowState | null): Promise<void> => {
    const normalizedWindowState = normalizeDesktopWindowState(windowState);
    store.commonSetSync(UI_WINDOW_LAST_STATE_KEY, normalizedWindowState);
    await store.commonSave();
  },
};

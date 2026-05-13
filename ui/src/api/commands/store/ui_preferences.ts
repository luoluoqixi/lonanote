import { store } from "./store";

export type ColorSchemeSetting = "light" | "dark" | "system";
export type AccentColorSetting = "blue" | "emerald" | "orange" | "rose";

export interface DesktopWindowState {
  height: number;
  isFullscreen: boolean;
  isMaximized: boolean;
  width: number;
  x: number;
  y: number;
}

export interface UiPreferences {
  appearance: {
    accentColor: AccentColorSetting;
    themeMode: ColorSchemeSetting;
    zoomFactor: number;
  };
  window: {
    lastWindowState: DesktopWindowState | null;
    restoreWindowState: boolean;
  };
}

const UI_ACCENT_COLOR_KEY = "ui.appearance.accentColor";
const UI_THEME_MODE_KEY = "ui.appearance.themeMode";
const UI_ZOOM_FACTOR_KEY = "ui.appearance.zoomFactor";
const UI_WINDOW_LAST_STATE_KEY = "ui.window.lastState";
const UI_RESTORE_WINDOW_STATE_KEY = "ui.window.restoreWindowState";

export function createDefaultUiPreferences(): UiPreferences {
  return {
    appearance: {
      accentColor: "blue",
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
  return value === "blue" || value === "emerald" || value === "orange" || value === "rose"
    ? value
    : "blue";
}

function normalizeThemeMode(value: unknown): ColorSchemeSetting {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
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

export const uiPreferences = {
  getPreferences: async (): Promise<UiPreferences> => {
    const defaults = createDefaultUiPreferences();
    const [accentColor, themeMode, zoomFactor, restoreWindowState, lastWindowState] =
      await Promise.all([
        store.commonGet<unknown>(UI_ACCENT_COLOR_KEY),
        store.commonGet<unknown>(UI_THEME_MODE_KEY),
        store.commonGet<unknown>(UI_ZOOM_FACTOR_KEY),
        store.commonGet<unknown>(UI_RESTORE_WINDOW_STATE_KEY),
        store.commonGet<unknown>(UI_WINDOW_LAST_STATE_KEY),
      ]);

    return {
      appearance: {
        accentColor: normalizeAccentColor(accentColor ?? defaults.appearance.accentColor),
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
  },
  savePreferences: async (preferences: UiPreferences): Promise<UiPreferences> => {
    await Promise.all([
      store.commonSet(UI_ACCENT_COLOR_KEY, preferences.appearance.accentColor),
      store.commonSet(UI_THEME_MODE_KEY, preferences.appearance.themeMode),
      store.commonSet(UI_ZOOM_FACTOR_KEY, normalizeZoomFactor(preferences.appearance.zoomFactor)),
      store.commonSet(UI_RESTORE_WINDOW_STATE_KEY, preferences.window.restoreWindowState),
      store.commonSet(UI_WINDOW_LAST_STATE_KEY, preferences.window.lastWindowState),
    ]);
    await store.commonSave();
    return preferences;
  },
  saveDesktopWindowState: async (windowState: DesktopWindowState | null): Promise<void> => {
    await store.commonSet(UI_WINDOW_LAST_STATE_KEY, windowState);
    await store.commonSave();
  },
};

import { store } from "@/api/commands/store";
import { isDesktop } from "@/api/common";
import {
  type AccentThemeName,
  defaultAccentThemeName,
  normalizeAccentThemeName,
} from "@/theme/accent_themes";

export type ColorSchemeSetting = "light" | "dark" | "system";
export type AccentColorSetting = AccentThemeName;
export type AppLayoutMode = "mobile" | "desktop";
export type WorkspaceExplorerGroupModeSetting = "date" | "none";
export type WorkspaceExplorerSortSetting =
  | "name"
  | "nameRev"
  | "lastModifiedTime"
  | "lastModifiedTimeRev"
  | "createTime"
  | "createTimeRev";
export type WorkspaceSelectGroupModeSetting = "date" | "storage" | "none";
export type WorkspaceSelectSortSetting =
  | "last-opened-desc"
  | "last-opened-asc"
  | "created-at-desc"
  | "created-at-asc"
  | "title-asc"
  | "title-desc";

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
  developer: {
    optionsEnabled: boolean;
  };
  workspaceExplorer: {
    foldersFirst: boolean;
    groupMode: WorkspaceExplorerGroupModeSetting;
    showFloatingToolbar: boolean;
    sortValue: WorkspaceExplorerSortSetting;
  };
  workspaceSelect: {
    groupMode: WorkspaceSelectGroupModeSetting;
    sortValue: WorkspaceSelectSortSetting;
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
const UI_DEVELOPER_OPTIONS_ENABLED_KEY = "ui.developer.optionsEnabled";
const UI_LAYOUT_MODE_KEY = "ui.shell.layoutMode";
const UI_WORKSPACE_EXPLORER_FOLDERS_FIRST_KEY = "ui.workspaceExplorer.foldersFirst";
const UI_WORKSPACE_EXPLORER_GROUP_MODE_KEY = "ui.workspaceExplorer.groupMode";
const UI_WORKSPACE_EXPLORER_SHOW_FLOATING_TOOLBAR_KEY = "ui.workspaceExplorer.showFloatingToolbar";
const UI_WORKSPACE_EXPLORER_SORT_VALUE_KEY = "ui.workspaceExplorer.sortValue";
const UI_WORKSPACE_SELECT_GROUP_MODE_KEY = "ui.workspaceSelect.groupMode";
const UI_WORKSPACE_SELECT_SORT_VALUE_KEY = "ui.workspaceSelect.sortValue";
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
    developer: {
      optionsEnabled: false,
    },
    workspaceExplorer: {
      foldersFirst: true,
      groupMode: "date",
      showFloatingToolbar: true,
      sortValue: "lastModifiedTime",
    },
    workspaceSelect: {
      groupMode: "date",
      sortValue: "last-opened-desc",
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

function normalizeWorkspaceExplorerSortValue(value: unknown): WorkspaceExplorerSortSetting {
  return value === "name" ||
    value === "nameRev" ||
    value === "lastModifiedTime" ||
    value === "lastModifiedTimeRev" ||
    value === "createTime" ||
    value === "createTimeRev"
    ? value
    : "lastModifiedTime";
}

function normalizeWorkspaceExplorerGroupMode(value: unknown): WorkspaceExplorerGroupModeSetting {
  return value === "none" ? "none" : "date";
}

function normalizeWorkspaceSelectSortValue(value: unknown): WorkspaceSelectSortSetting {
  return value === "last-opened-desc" ||
    value === "last-opened-asc" ||
    value === "created-at-desc" ||
    value === "created-at-asc" ||
    value === "title-asc" ||
    value === "title-desc"
    ? value
    : "last-opened-desc";
}

function normalizeWorkspaceSelectGroupMode(value: unknown): WorkspaceSelectGroupModeSetting {
  return value === "storage" || value === "none" ? value : "date";
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
  const workspaceExplorerSortValue = normalizeWorkspaceExplorerSortValue(
    preferences.workspaceExplorer?.sortValue,
  );

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
    developer: {
      optionsEnabled: Boolean(preferences.developer?.optionsEnabled),
    },
    workspaceExplorer: {
      foldersFirst: preferences.workspaceExplorer?.foldersFirst !== false,
      groupMode: normalizeWorkspaceExplorerGroupMode(preferences.workspaceExplorer?.groupMode),
      showFloatingToolbar: preferences.workspaceExplorer?.showFloatingToolbar !== false,
      sortValue: workspaceExplorerSortValue,
    },
    workspaceSelect: {
      groupMode: normalizeWorkspaceSelectGroupMode(preferences.workspaceSelect?.groupMode),
      sortValue: normalizeWorkspaceSelectSortValue(preferences.workspaceSelect?.sortValue),
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
  const developerOptionsEnabled = store.commonGetSync<unknown>(UI_DEVELOPER_OPTIONS_ENABLED_KEY);
  const restoreWindowState = store.commonGetSync<unknown>(UI_RESTORE_WINDOW_STATE_KEY);
  const lastWindowState = store.commonGetSync<unknown>(UI_WINDOW_LAST_STATE_KEY);
  const layoutMode = store.commonGetSync<unknown>(UI_LAYOUT_MODE_KEY);
  const workspaceExplorerFoldersFirst = store.commonGetSync<unknown>(
    UI_WORKSPACE_EXPLORER_FOLDERS_FIRST_KEY,
  );
  const workspaceExplorerGroupMode = store.commonGetSync<unknown>(
    UI_WORKSPACE_EXPLORER_GROUP_MODE_KEY,
  );
  const workspaceExplorerShowFloatingToolbar = store.commonGetSync<unknown>(
    UI_WORKSPACE_EXPLORER_SHOW_FLOATING_TOOLBAR_KEY,
  );
  const workspaceExplorerSortValue = normalizeWorkspaceExplorerSortValue(
    store.commonGetSync<unknown>(UI_WORKSPACE_EXPLORER_SORT_VALUE_KEY),
  );
  const workspaceSelectGroupMode = store.commonGetSync<unknown>(UI_WORKSPACE_SELECT_GROUP_MODE_KEY);
  const workspaceSelectSortValue = store.commonGetSync<unknown>(UI_WORKSPACE_SELECT_SORT_VALUE_KEY);

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
    developer: {
      optionsEnabled:
        typeof developerOptionsEnabled === "boolean"
          ? developerOptionsEnabled
          : defaults.developer.optionsEnabled,
    },
    workspaceExplorer: {
      foldersFirst:
        typeof workspaceExplorerFoldersFirst === "boolean"
          ? workspaceExplorerFoldersFirst
          : defaults.workspaceExplorer.foldersFirst,
      groupMode: normalizeWorkspaceExplorerGroupMode(workspaceExplorerGroupMode),
      showFloatingToolbar:
        typeof workspaceExplorerShowFloatingToolbar === "boolean"
          ? workspaceExplorerShowFloatingToolbar
          : defaults.workspaceExplorer.showFloatingToolbar,
      sortValue: workspaceExplorerSortValue,
    },
    workspaceSelect: {
      groupMode: normalizeWorkspaceSelectGroupMode(
        workspaceSelectGroupMode ?? defaults.workspaceSelect.groupMode,
      ),
      sortValue: normalizeWorkspaceSelectSortValue(
        workspaceSelectSortValue ?? defaults.workspaceSelect.sortValue,
      ),
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
  store.commonSetSync(
    UI_DEVELOPER_OPTIONS_ENABLED_KEY,
    normalizedPreferences.developer.optionsEnabled,
  );
  store.commonSetSync(
    UI_WORKSPACE_EXPLORER_FOLDERS_FIRST_KEY,
    normalizedPreferences.workspaceExplorer.foldersFirst,
  );
  store.commonSetSync(
    UI_WORKSPACE_EXPLORER_GROUP_MODE_KEY,
    normalizedPreferences.workspaceExplorer.groupMode,
  );
  store.commonSetSync(
    UI_WORKSPACE_EXPLORER_SHOW_FLOATING_TOOLBAR_KEY,
    normalizedPreferences.workspaceExplorer.showFloatingToolbar,
  );
  store.commonSetSync(
    UI_WORKSPACE_EXPLORER_SORT_VALUE_KEY,
    normalizedPreferences.workspaceExplorer.sortValue,
  );
  store.commonSetSync(
    UI_WORKSPACE_SELECT_GROUP_MODE_KEY,
    normalizedPreferences.workspaceSelect.groupMode,
  );
  store.commonSetSync(
    UI_WORKSPACE_SELECT_SORT_VALUE_KEY,
    normalizedPreferences.workspaceSelect.sortValue,
  );
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

import type { FontSelection } from "@/api/commands/fonts/types";
import { store } from "@/api/commands/store";
import { isDesktop } from "@/api/common";
import type { CommonStoreSnapshot } from "@/api/common/common_store_sync";
import { clampWindowZoom } from "@/api/common/window_zoom";
import { normalizeFontSelection } from "@/fonts/font_selection";
import {
  type AccentThemeName,
  defaultAccentThemeName,
  normalizeAccentThemeName,
} from "@/theme/accent_themes";

export type ColorSchemeSetting = "light" | "dark" | "system";
/** A preset theme name or an opaque hex color selected by the user. */
export type AccentColorSetting = AccentThemeName | string;
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
  | "modified-at-desc"
  | "modified-at-asc"
  | "last-opened-desc"
  | "last-opened-asc"
  | "created-at-desc"
  | "created-at-asc"
  | "title-asc"
  | "title-desc";

export interface DesktopWindowSize {
  height: number;
  width: number;
}

export interface UiPreferences {
  shell: {
    layoutMode: AppLayoutMode;
  };
  appearance: {
    font: FontSelection;
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
    lastSize: DesktopWindowSize | null;
    rememberSize: boolean;
  };
}

const UI_FONT_KEY = "ui.appearance.font";
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
const UI_WINDOW_LAST_SIZE_KEY = "ui.window.lastSize";
const UI_REMEMBER_WINDOW_SIZE_KEY = "ui.window.rememberSize";

export function createDefaultUiPreferences(): UiPreferences {
  return {
    shell: {
      layoutMode: isDesktop() ? "desktop" : "mobile",
    },
    appearance: {
      font: null,
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
      sortValue: "modified-at-desc",
    },
    window: {
      lastSize: null,
      rememberSize: true,
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

  return clampWindowZoom(value);
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
  return value === "modified-at-desc" ||
    value === "modified-at-asc" ||
    value === "last-opened-desc" ||
    value === "last-opened-asc" ||
    value === "created-at-desc" ||
    value === "created-at-asc" ||
    value === "title-asc" ||
    value === "title-desc"
    ? value
    : "modified-at-desc";
}

function normalizeWorkspaceSelectGroupMode(value: unknown): WorkspaceSelectGroupModeSetting {
  return value === "storage" || value === "none" ? value : "date";
}

function normalizeDesktopWindowSize(value: unknown): DesktopWindowSize | null {
  if (value == null || typeof value !== "object") return null;
  const candidate = value as Partial<DesktopWindowSize>;
  if (
    typeof candidate.width !== "number" ||
    typeof candidate.height !== "number" ||
    !Number.isFinite(candidate.width) ||
    !Number.isFinite(candidate.height) ||
    candidate.width <= 0 ||
    candidate.height <= 0
  )
    return null;
  return { width: candidate.width, height: candidate.height };
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
      font: normalizeFontSelection(preferences.appearance.font),
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
      lastSize: normalizeDesktopWindowSize(preferences.window.lastSize),
      rememberSize: Boolean(preferences.window.rememberSize),
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
  const rememberSize = store.commonGetSync<unknown>(UI_REMEMBER_WINDOW_SIZE_KEY);
  const lastSize = store.commonGetSync<unknown>(UI_WINDOW_LAST_SIZE_KEY);
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
      font: normalizeFontSelection(store.commonGetSync<unknown>(UI_FONT_KEY)),
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
      lastSize: normalizeDesktopWindowSize(lastSize),
      rememberSize: typeof rememberSize === "boolean" ? rememberSize : defaults.window.rememberSize,
    },
  };
}

function toStoreEntries(preferences: UiPreferences): Array<[string, unknown]> {
  return [
    [UI_FONT_KEY, preferences.appearance.font],
    [UI_LAYOUT_MODE_KEY, preferences.shell.layoutMode],
    [UI_ACCENT_COLOR_KEY, preferences.appearance.accentColor],
    [UI_BACKGROUND_FOLLOWS_THEME_KEY, preferences.appearance.backgroundFollowsTheme],
    [UI_THEME_MODE_KEY, preferences.appearance.themeMode],
    [UI_ZOOM_FACTOR_KEY, preferences.appearance.zoomFactor],
    [UI_DEVELOPER_OPTIONS_ENABLED_KEY, preferences.developer.optionsEnabled],
    [UI_WORKSPACE_EXPLORER_FOLDERS_FIRST_KEY, preferences.workspaceExplorer.foldersFirst],
    [UI_WORKSPACE_EXPLORER_GROUP_MODE_KEY, preferences.workspaceExplorer.groupMode],
    [
      UI_WORKSPACE_EXPLORER_SHOW_FLOATING_TOOLBAR_KEY,
      preferences.workspaceExplorer.showFloatingToolbar,
    ],
    [UI_WORKSPACE_EXPLORER_SORT_VALUE_KEY, preferences.workspaceExplorer.sortValue],
    [UI_WORKSPACE_SELECT_GROUP_MODE_KEY, preferences.workspaceSelect.groupMode],
    [UI_WORKSPACE_SELECT_SORT_VALUE_KEY, preferences.workspaceSelect.sortValue],
    [UI_REMEMBER_WINDOW_SIZE_KEY, preferences.window.rememberSize],
    [UI_WINDOW_LAST_SIZE_KEY, preferences.window.lastSize],
  ];
}

export const uiPreferences = {
  getPreferences: (): UiPreferences => {
    return readUiPreferencesFromStore();
  },
  applyCommonStoreSnapshot: (snapshot: CommonStoreSnapshot): UiPreferences => {
    store.applyCommonSnapshot(snapshot);
    return readUiPreferencesFromStore();
  },
  reloadPreferences: (): UiPreferences => {
    store.commonReloadSync();
    return readUiPreferencesFromStore();
  },
  savePreferences: async (preferences: UiPreferences): Promise<UiPreferences> => {
    const normalizedPreferences = normalizeUiPreferences(preferences);
    const currentEntries = new Map(toStoreEntries(readUiPreferencesFromStore()));
    for (const [key, value] of toStoreEntries(normalizedPreferences)) {
      if (JSON.stringify(currentEntries.get(key)) !== JSON.stringify(value)) {
        store.commonSetSync(key, value);
      }
    }
    await store.commonSave();
    // 等待写盘期间可能已经收到其他窗口的新版本，不能用提交前的整份设置回退投影。
    return readUiPreferencesFromStore();
  },
  saveDesktopWindowSize: async (windowState: DesktopWindowSize | null): Promise<void> => {
    const normalizedWindowState = normalizeDesktopWindowSize(windowState);
    store.commonSetSync(UI_WINDOW_LAST_SIZE_KEY, normalizedWindowState);
    await store.commonSave();
  },
};

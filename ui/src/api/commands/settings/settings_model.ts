import type { FontSelection } from "@/api/commands/fonts/types";
import { normalizeFontSelection, sameFontSelection } from "@/fonts/font_selection";

export interface SettingsPayload {
  firstSetup: boolean;
  autoCheckUpdate: boolean;
  autoOpenLastWorkspace: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  autoSaveFocusChange: boolean;
  showLineNumber: boolean;
  disableLineWrap: boolean;
  sourceMode: boolean;
  editorFont: FontSelection;
}

export interface GlobalSettings {
  system: {
    firstSetup: boolean;
  };
  app: {
    autoCheckUpdate: boolean;
    autoOpenLastWorkspace: boolean;
  };
  editorDefaults: {
    autoSave: boolean;
    autoSaveIntervalSeconds: number;
    autoSaveOnFocusChange: boolean;
    showLineNumber: boolean;
    disableLineWrap: boolean;
    sourceMode: boolean;
    font: FontSelection;
  };
}

export interface GlobalSettingsSnapshot {
  runtimeId: string;
  revision: number;
  values: GlobalSettings;
}

export interface SettingsPatchPayload extends Partial<SettingsPayload> {}

export function createDefaultGlobalSettings(): GlobalSettings {
  return {
    system: {
      firstSetup: true,
    },
    app: {
      autoCheckUpdate: true,
      autoOpenLastWorkspace: true,
    },
    editorDefaults: {
      autoSave: true,
      autoSaveIntervalSeconds: 1,
      autoSaveOnFocusChange: true,
      showLineNumber: false,
      disableLineWrap: false,
      sourceMode: false,
      font: null,
    },
  };
}

export function fromSettingsPayload(
  payload: Partial<SettingsPayload> | null | undefined,
): GlobalSettings {
  const defaults = createDefaultGlobalSettings();

  return {
    system: {
      firstSetup: payload?.firstSetup ?? defaults.system.firstSetup,
    },
    app: {
      autoCheckUpdate: payload?.autoCheckUpdate ?? defaults.app.autoCheckUpdate,
      autoOpenLastWorkspace: payload?.autoOpenLastWorkspace ?? defaults.app.autoOpenLastWorkspace,
    },
    editorDefaults: {
      autoSave: payload?.autoSave ?? defaults.editorDefaults.autoSave,
      autoSaveIntervalSeconds:
        payload?.autoSaveInterval ?? defaults.editorDefaults.autoSaveIntervalSeconds,
      autoSaveOnFocusChange:
        payload?.autoSaveFocusChange ?? defaults.editorDefaults.autoSaveOnFocusChange,
      showLineNumber: payload?.showLineNumber ?? defaults.editorDefaults.showLineNumber,
      disableLineWrap: payload?.disableLineWrap ?? defaults.editorDefaults.disableLineWrap,
      sourceMode: payload?.sourceMode ?? defaults.editorDefaults.sourceMode,
      font: normalizeFontSelection(payload?.editorFont),
    },
  };
}

export function toSettingsPayload(settings: GlobalSettings): SettingsPayload {
  return {
    firstSetup: settings.system.firstSetup,
    autoCheckUpdate: settings.app.autoCheckUpdate,
    autoOpenLastWorkspace: settings.app.autoOpenLastWorkspace,
    autoSave: settings.editorDefaults.autoSave,
    autoSaveInterval: settings.editorDefaults.autoSaveIntervalSeconds,
    autoSaveFocusChange: settings.editorDefaults.autoSaveOnFocusChange,
    showLineNumber: settings.editorDefaults.showLineNumber,
    disableLineWrap: settings.editorDefaults.disableLineWrap,
    sourceMode: settings.editorDefaults.sourceMode,
    editorFont: settings.editorDefaults.font,
  };
}

export function diffSettings(previous: GlobalSettings, next: GlobalSettings): SettingsPatchPayload {
  const oldPayload = toSettingsPayload(previous);
  const nextPayload = toSettingsPayload(next);
  const patch: SettingsPatchPayload = {};
  for (const key of Object.keys(nextPayload) as Array<keyof SettingsPayload>) {
    if (
      key === "editorFont"
        ? !sameFontSelection(oldPayload.editorFont, nextPayload.editorFont)
        : !Object.is(oldPayload[key], nextPayload[key])
    ) {
      patch[key] = nextPayload[key] as never;
    }
  }
  return patch;
}

import { invoke } from "@/api/invoke";

interface SettingsPayload {
  firstSetup: boolean;
  autoCheckUpdate: boolean;
  autoOpenLastWorkspace: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
  autoSaveFocusChange: boolean;
  showLineNumber: boolean;
  disableLineWrap: boolean;
  sourceMode: boolean;
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
  };
}

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
    },
  };
}

function fromSettingsPayload(payload: Partial<SettingsPayload> | null | undefined): GlobalSettings {
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
    },
  };
}

function toSettingsPayload(settings: GlobalSettings): SettingsPayload {
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
  };
}

export const settings = {
  getSettings: async (): Promise<GlobalSettings> => {
    const payload = (await invoke("settings.get_settings")) as SettingsPayload | null;
    return fromSettingsPayload(payload);
  },
  setSettings: async (globalSettings: GlobalSettings): Promise<GlobalSettings> => {
    await invoke("settings.set_settings", toSettingsPayload(globalSettings));
    return globalSettings;
  },
  setSettingsAndSave: async (globalSettings: GlobalSettings): Promise<GlobalSettings> => {
    await invoke("settings.set_settings_and_save", toSettingsPayload(globalSettings));
    return globalSettings;
  },
  saveSettings: async (): Promise<void> => {
    return (await invoke("settings.save_settings"))!;
  },
  resetSettingsAutoSaveInterval: async (): Promise<GlobalSettings> => {
    await invoke("settings.reset_settings_auto_save_interval");
    return settings.getSettings();
  },
};

import { invoke } from "@/api/invoke";

import { diffSettings, fromSettingsPayload, toSettingsPayload } from "./settings_model";
import type {
  GlobalSettings,
  GlobalSettingsSnapshot,
  SettingsPatchPayload,
  SettingsPayload,
} from "./settings_model";

export * from "./settings_model";

export const settings = {
  getSettings: async (): Promise<GlobalSettings> => {
    const payload = (await invoke("settings.get_settings")) as SettingsPayload | null;
    return fromSettingsPayload(payload);
  },
  snapshot: async (): Promise<GlobalSettingsSnapshot> => {
    const snapshot = (await invoke("settings.snapshot")) as {
      runtimeId: string;
      revision: number;
      values: SettingsPayload;
    };
    return {
      ...snapshot,
      values: fromSettingsPayload(snapshot.values),
    };
  },
  patchAndSave: async (patch: SettingsPatchPayload): Promise<GlobalSettingsSnapshot> => {
    const snapshot = (await invoke("settings.patch_and_save", { ...patch })) as {
      runtimeId: string;
      revision: number;
      values: SettingsPayload;
    };
    return {
      ...snapshot,
      values: fromSettingsPayload(snapshot.values),
    };
  },
  setSettings: async (globalSettings: GlobalSettings): Promise<GlobalSettings> => {
    await invoke("settings.set_settings", toSettingsPayload(globalSettings));
    return globalSettings;
  },
  setSettingsAndSave: async (globalSettings: GlobalSettings): Promise<GlobalSettings> => {
    const current = await settings.getSettings();
    const snapshot = await settings.patchAndSave(diffSettings(current, globalSettings));
    return snapshot.values;
  },
  saveSettings: async (): Promise<void> => {
    return (await invoke("settings.save_settings"))!;
  },
  resetSettingsAutoSaveInterval: async (): Promise<GlobalSettings> => {
    await invoke("settings.reset_settings_auto_save_interval");
    return settings.getSettings();
  },
};

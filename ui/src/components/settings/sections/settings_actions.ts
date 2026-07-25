import type { GlobalSettings } from "@/api/commands/settings";

function reportAsyncError(scope: string, error: unknown) {
  console.error(`[settings] ${scope} failed`, error);
}

export function runSettingsAction(scope: string, action: Promise<unknown>) {
  void action.catch((error) => {
    reportAsyncError(scope, error);
  });
}

export function updateGlobalSettingsSection<K extends keyof GlobalSettings>(
  currentSettings: GlobalSettings,
  sectionKey: K,
  nextSectionValue: GlobalSettings[K],
): GlobalSettings {
  return {
    ...currentSettings,
    [sectionKey]: nextSectionValue,
  };
}

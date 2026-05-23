import { View } from "react-native";

import { useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import { Dialog } from "../ui";
import { SettingsSyncState } from "./settings_panels";
import { SettingsTabsPanel } from "./settings_tabs_panel";

type WideSettingsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

// Wide settings follows the legacy renderer and opens as a dialog; compact layout keeps route-based access.
export function WideSettingsDialog({ isOpen, onOpenChange }: WideSettingsDialogProps) {
  const globalSettingsState = useGlobalSettings();
  const uiPreferencesState = useUiPreferences();

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} title="设置" width="80%">
      <View style={{ flexShrink: 1, minHeight: 0 }}>
        <SettingsSyncState
          error={globalSettingsState.error ?? uiPreferencesState.error}
          isLoading={globalSettingsState.isLoading || uiPreferencesState.isLoading}
        />
        <SettingsTabsPanel initialTab="global" />
      </View>
    </Dialog>
  );
}

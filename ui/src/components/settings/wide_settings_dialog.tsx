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
    <Dialog
      contentStyle={{
        maxHeight: "98%",
        maxWidth: "98%",
        minHeight: "10%",
        width: "90%",
        height: "95%",
      }}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="设置"
    >
      <View style={{ flex: 1, minHeight: 0 }}>
        <SettingsSyncState
          error={globalSettingsState.error ?? uiPreferencesState.error}
          isLoading={globalSettingsState.isLoading || uiPreferencesState.isLoading}
        />
        <SettingsTabsPanel initialTab="global" />
      </View>
    </Dialog>
  );
}

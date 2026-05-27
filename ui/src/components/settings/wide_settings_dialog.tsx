import { View } from "react-native";

import { isWeb } from "@/api/common/platform";
import { useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import { Dialog } from "../ui";
import { SettingsSyncState } from "./settings_panels";
import { SettingsTabsPanel } from "./settings_tabs_panel";

type WideSettingsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const DIALOG_WIDTH = isWeb() ? "80%" : "90%";
const DIALOG_HEIGHT = isWeb() ? "80%" : "82%";

// Wide settings follows the legacy renderer and opens as a dialog; compact layout keeps route-based access.
export function WideSettingsDialog({ isOpen, onOpenChange }: WideSettingsDialogProps) {
  const globalSettingsState = useGlobalSettings();
  const uiPreferencesState = useUiPreferences();

  return (
    <Dialog
      minHeight={0}
      width={DIALOG_WIDTH}
      height={DIALOG_HEIGHT}
      onOpenChange={onOpenChange}
      open={isOpen}
      title="设置"
    >
      <View style={{ flex: 1, flexShrink: 1, minHeight: 0 }}>
        <SettingsSyncState
          error={globalSettingsState.error ?? uiPreferencesState.error}
          isLoading={globalSettingsState.isLoading || uiPreferencesState.isLoading}
        />
        <SettingsTabsPanel initialTab="global" />
      </View>
    </Dialog>
  );
}

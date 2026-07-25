import { View } from "react-native";
import { Dialog } from "rn-ui-kit";

import { isWeb } from "@/api/common/platform";
import { useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import { SettingsSyncState } from "../sections";
import { SettingsTabsPanel } from "./settings_tabs";

type WideSettingsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const DIALOG_WIDTH = isWeb() ? "80%" : "90%";
const DIALOG_HEIGHT = isWeb() ? "80%" : "82%";

// 宽屏布局使用 Dialog，紧凑布局使用独立设置路由。
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

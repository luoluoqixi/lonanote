import { useState } from "react";
import { ScrollView, View } from "react-native";

import { useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import { Button, Dialog } from "../ui";
import {
  AppearanceSettingsPanel,
  GlobalSettingsPanel,
  SettingsSyncState,
  type SettingsTabKey,
  WindowSettingsPanel,
  settingsTabs,
} from "./settings_panels";

type DesktopSettingsDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

function renderSettingsTab(tab: SettingsTabKey) {
  switch (tab) {
    case "appearance":
      return <AppearanceSettingsPanel />;
    case "window":
      return <WindowSettingsPanel />;
    case "global":
    default:
      return <GlobalSettingsPanel />;
  }
}

// Desktop settings follows the legacy renderer and opens as a dialog; compact layout keeps route-based access.
export function DesktopSettingsDialog({ isOpen, onOpenChange }: DesktopSettingsDialogProps) {
  const [selectedTab, setSelectedTab] = useState<SettingsTabKey>("global");
  const globalSettingsState = useGlobalSettings();
  const uiPreferencesState = useUiPreferences();

  return (
    <Dialog
      contentStyle={{
        height: "76%",
        maxHeight: 680,
        maxWidth: 980,
        minHeight: 480,
        width: "90%",
      }}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="设置"
    >
      <View style={{ flex: 1, flexDirection: "row", gap: 16, minHeight: 0 }}>
        <View
          className="w-44 rounded-2xl border border-foreground/10 bg-background px-2 py-2"
          style={{ minHeight: 0 }}
        >
          {settingsTabs.map((tab) => {
            return (
              <Button
                accessibilityLabel={tab.label}
                className="mb-2 w-full justify-start"
                key={tab.key}
                onPress={() => setSelectedTab(tab.key)}
                size="sm"
                variant={tab.key === selectedTab ? "secondary" : "ghost"}
              >
                {tab.label}
              </Button>
            );
          })}
        </View>

        <View
          className="flex-1 rounded-2xl border border-foreground/10 bg-accent/5 px-4 py-4"
          style={{ minHeight: 0 }}
        >
          <SettingsSyncState
            error={globalSettingsState.error ?? uiPreferencesState.error}
            isLoading={globalSettingsState.isLoading || uiPreferencesState.isLoading}
          />
          <ScrollView
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator
            style={{ flex: 1, minHeight: 0 }}
          >
            {renderSettingsTab(selectedTab)}
          </ScrollView>
        </View>
      </View>
    </Dialog>
  );
}

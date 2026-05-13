import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import { Dialog } from "../ui";
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
            const active = tab.key === selectedTab;

            return (
              <Pressable
                key={tab.key}
                className={
                  active ? "mb-2 rounded-xl bg-accent/10 px-3 py-3" : "mb-2 rounded-xl px-3 py-3"
                }
                onPress={() => setSelectedTab(tab.key)}
              >
                <Text
                  className={
                    active ? "text-sm font-medium text-accent" : "text-sm text-foreground/75"
                  }
                >
                  {tab.label}
                </Text>
              </Pressable>
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

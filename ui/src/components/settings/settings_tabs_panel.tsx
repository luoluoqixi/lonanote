import { type ReactNode, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { Tabs } from "@/components/ui";

import {
  AppearanceSettingsPanel,
  GlobalSettingsPanel,
  type SettingsTabKey,
  WindowSettingsPanel,
  settingsTabs,
} from "./settings_panels";

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

function SettingsTabScrollPane({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 min-h-0">
      <ScrollView
        className="flex-1 min-h-0"
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator
        style={{ flex: 1, minHeight: 0 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

type SettingsTabsPanelProps = {
  initialTab?: SettingsTabKey;
};

export function SettingsTabsPanel({ initialTab = "global" }: SettingsTabsPanelProps) {
  const [selectedTab, setSelectedTab] = useState<SettingsTabKey>(initialTab);

  useEffect(() => {
    setSelectedTab(initialTab);
  }, [initialTab]);

  return (
    <View className="flex-1 min-h-0">
      <Tabs
        accessibilityLabel="设置面板导航"
        className="flex-1 min-h-0 flex-row gap-4"
        indicatorClassName="!hidden"
        onValueChange={(nextValue) => setSelectedTab(nextValue as SettingsTabKey)}
        items={settingsTabs.map((tab) => ({
          content: <SettingsTabScrollPane>{renderSettingsTab(tab.key)}</SettingsTabScrollPane>,
          label: tab.label,
          value: tab.key,
        }))}
        listClassName="border-0 w-full flex-col gap-0 bg-transparent"
        listContainerClassName="w-48 bg-overlay"
        tabClassName="h-10 border-b-2 border-transparent hover:bg-[var(--default-hover)] hover:text-foreground data-[selected=true]:border-b-[var(--accent)] data-[selected=true]:text-foreground"
        panelClassName="flex flex-1 min-h-0 overflow-hidden bg-overlay p-0"
        value={selectedTab}
        orientation="vertical"
      />
    </View>
  );
}

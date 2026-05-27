import { type ReactNode, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

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
    <View style={styles.scrollPane}>
      <ScrollView
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
    <View style={styles.root}>
      <Tabs
        aria-label="设置面板导航"
        onValueChange={(nextValue) => setSelectedTab(nextValue as SettingsTabKey)}
        items={settingsTabs.map((tab) => ({
          content: <SettingsTabScrollPane>{renderSettingsTab(tab.key)}</SettingsTabScrollPane>,
          label: tab.label,
          value: tab.key,
        }))}
        listProps={{ style: styles.list }}
        contentProps={{ style: styles.content }}
        style={styles.tabs}
        value={selectedTab}
        orientation="vertical"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  list: {
    alignSelf: "stretch",
    flexDirection: "column",
    gap: 4,
    width: 140,
  },
  root: {
    flex: 1,
    minHeight: 0,
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
    gap: 16,
    minHeight: 0,
  },
  scrollPane: {
    flex: 1,
    minHeight: 0,
  },
});

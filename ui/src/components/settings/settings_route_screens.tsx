import { type Href, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isDesktop } from "@/api/common";
import { useColorSchemeSettings, useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import { TitleBar } from "../titlebar";
import { Button, Text } from "../ui";
import { SettingsSyncState } from "./settings_panels";
import { SettingsTabsPanel } from "./settings_tabs_panel";

const SCREEN_MAX_WIDTH = 960;
const HOME_HREF = "/" as Href;
const SETTINGS_HREF = "/settings" as Href;

type ScreenLayoutProps = {
  backHref: Href;
  children: ReactNode;
  error: string | null;
  isLoading: boolean;
  title: string;
};

function SettingsScreenLayout({ backHref, children, error, isLoading, title }: ScreenLayoutProps) {
  const router = useRouter();
  const desktop = isDesktop();

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      {desktop ? <TitleBar /> : null}
      <View style={styles.page}>
        <View style={{ flex: 1, padding: 20 }}>
          <View style={{ alignSelf: "center", flex: 1, maxWidth: SCREEN_MAX_WIDTH, width: "100%" }}>
            <View style={styles.header}>
              <Button onPress={() => router.replace(backHref)} variant="outlined">
                {backHref === HOME_HREF ? "返回首页" : "返回设置"}
              </Button>
              <Text fontSize="$8" fontWeight="700" style={styles.title}>
                {title}
              </Text>
              <View style={styles.syncState}>
                <SettingsSyncState error={error} isLoading={isLoading} />
              </View>
            </View>

            <View style={styles.content}>{children}</View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function GlobalSettingsHomeScreen() {
  const globalSettingsState = useGlobalSettings();
  const uiPreferencesState = useUiPreferences();

  return (
    <SettingsScreenLayout
      backHref={HOME_HREF}
      error={globalSettingsState.error ?? uiPreferencesState.error}
      isLoading={globalSettingsState.isLoading || uiPreferencesState.isLoading}
      title="设置"
    >
      <SettingsTabsPanel initialTab="global" />
    </SettingsScreenLayout>
  );
}

export function AppearanceSettingsScreen() {
  const { error, isLoading } = useColorSchemeSettings();

  return (
    <SettingsScreenLayout
      backHref={SETTINGS_HREF}
      error={error}
      isLoading={isLoading}
      title="外观设置"
    >
      <SettingsTabsPanel initialTab="appearance" />
    </SettingsScreenLayout>
  );
}

export function WindowSettingsScreen() {
  const { error, isLoading } = useUiPreferences();

  return (
    <SettingsScreenLayout
      backHref={SETTINGS_HREF}
      error={error}
      isLoading={isLoading}
      title="窗口设置"
    >
      <SettingsTabsPanel initialTab="window" />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    marginBottom: 20,
    padding: 20,
  },
  page: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  syncState: {
    minHeight: 0,
  },
  title: {
    marginTop: 4,
  },
});

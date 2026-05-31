import { type Href, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isDesktop, isWeb } from "@/api/common";
import { useColorSchemeSettings, useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import { TitleBar } from "../titlebar";
import { Button, Text } from "../ui";
import {
  AppearanceSettingsPanel,
  GlobalSettingsPanel,
  SettingsSyncState,
  WindowSettingsPanel,
} from "./settings_panels";

const SCREEN_MAX_WIDTH = 960;

type SettingsRouteKey = "global" | "appearance" | "window";

type SettingsRouteDefinition = {
  Component: () => ReactNode;
  description: string;
  href: Href;
  key: SettingsRouteKey;
  label: string;
};

const SETTINGS_ROUTE_DEFINITIONS: SettingsRouteDefinition[] = [
  {
    Component: GlobalSettingsPanel,
    description: "应用行为与编辑器默认值。",
    href: "/settings/global" as Href,
    key: "global",
    label: "全局设置",
  },
  {
    Component: AppearanceSettingsPanel,
    description: "主题模式、主题色与桌面缩放。",
    href: "/settings/appearance" as Href,
    key: "appearance",
    label: "外观设置",
  },
  {
    Component: WindowSettingsPanel,
    description: "窗口恢复、最近窗口状态与桌面行为。",
    href: "/settings/window" as Href,
    key: "window",
    label: "窗口设置",
  },
];

function getSettingsRouteDefinition(key: SettingsRouteKey): SettingsRouteDefinition {
  const matchedDefinition = SETTINGS_ROUTE_DEFINITIONS.find((definition) => definition.key === key);

  if (!matchedDefinition) {
    throw new Error(`Unknown settings route: ${key}`);
  }

  return matchedDefinition;
}

type SettingsSyncSnapshot = {
  error: string | null;
  isLoading: boolean;
};

function mergeSettingsSyncState(...states: SettingsSyncSnapshot[]): SettingsSyncSnapshot {
  return {
    error: states.find((state) => state.error != null)?.error ?? null,
    isLoading: states.some((state) => state.isLoading),
  };
}

type ScreenLayoutProps = {
  children: ReactNode;
  description?: string;
  error: string | null;
  isLoading: boolean;
  title: string;
};

function SettingsScreenLayout({
  children,
  description,
  error,
  isLoading,
  title,
}: ScreenLayoutProps) {
  const desktop = isDesktop();
  const usesNativeHeader = !isWeb();
  const showMeta = description != null || error != null || isLoading;

  return (
    <SafeAreaView
      edges={usesNativeHeader ? ["bottom", "left", "right"] : ["top"]}
      style={styles.safeArea}
    >
      {desktop ? <TitleBar /> : null}
      <View style={styles.page}>
        <View style={styles.pagePadding}>
          <View style={styles.pageContainer}>
            {!usesNativeHeader ? (
              <View style={styles.header}>
                <Text fontSize="$8" fontWeight="700">
                  {title}
                </Text>
                {description ? (
                  <Text color="$color10" fontSize="$3">
                    {description}
                  </Text>
                ) : null}
                <View style={styles.syncState}>
                  <SettingsSyncState error={error} isLoading={isLoading} />
                </View>
              </View>
            ) : null}

            {usesNativeHeader && showMeta ? (
              <View style={styles.metaPanel}>
                {description ? (
                  <Text color="$color10" fontSize="$3">
                    {description}
                  </Text>
                ) : null}
                <View style={styles.syncState}>
                  <SettingsSyncState error={error} isLoading={isLoading} />
                </View>
              </View>
            ) : null}

            <View style={styles.content}>{children}</View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function useSettingsHomeSyncState(): SettingsSyncSnapshot {
  const globalSettingsState = useGlobalSettings();
  const uiPreferencesState = useUiPreferences();
  const colorSchemeSettingsState = useColorSchemeSettings();

  return mergeSettingsSyncState(
    { error: globalSettingsState.error, isLoading: globalSettingsState.isLoading },
    { error: uiPreferencesState.error, isLoading: uiPreferencesState.isLoading },
    { error: colorSchemeSettingsState.error, isLoading: colorSchemeSettingsState.isLoading },
  );
}

function useSettingsSectionSyncState(sectionKey: SettingsRouteKey): SettingsSyncSnapshot {
  const globalSettingsState = useGlobalSettings();
  const uiPreferencesState = useUiPreferences();
  const colorSchemeSettingsState = useColorSchemeSettings();

  switch (sectionKey) {
    case "appearance":
      return mergeSettingsSyncState(
        { error: colorSchemeSettingsState.error, isLoading: colorSchemeSettingsState.isLoading },
        { error: uiPreferencesState.error, isLoading: uiPreferencesState.isLoading },
      );
    case "window":
      return {
        error: uiPreferencesState.error,
        isLoading: uiPreferencesState.isLoading,
      };
    case "global":
    default:
      return {
        error: globalSettingsState.error,
        isLoading: globalSettingsState.isLoading,
      };
  }
}

export function SettingsHomeScreen() {
  const router = useRouter();
  const syncState = useSettingsHomeSyncState();

  return (
    <SettingsScreenLayout
      description="小屏设备下通过独立页面查看各设置分区。"
      error={syncState.error}
      isLoading={syncState.isLoading}
      title="设置"
    >
      <View style={styles.sectionList}>
        {SETTINGS_ROUTE_DEFINITIONS.map((definition) => (
          <View key={definition.key} style={styles.sectionCard}>
            <View style={styles.sectionCardText}>
              <Text fontSize="$5" fontWeight="600">
                {definition.label}
              </Text>
              <Text color="$color10" fontSize="$3">
                {definition.description}
              </Text>
            </View>
            <Button onPress={() => router.push(definition.href)}>打开{definition.label}</Button>
          </View>
        ))}
      </View>
    </SettingsScreenLayout>
  );
}

function SettingsSectionScreen({ sectionKey }: { sectionKey: SettingsRouteKey }) {
  const definition = getSettingsRouteDefinition(sectionKey);
  const syncState = useSettingsSectionSyncState(sectionKey);
  const SectionComponent = definition.Component;

  return (
    <SettingsScreenLayout
      description={definition.description}
      error={syncState.error}
      isLoading={syncState.isLoading}
      title={definition.label}
    >
      <View style={styles.panelHost}>
        <ScrollView
          contentContainerStyle={styles.panelScrollContent}
          showsVerticalScrollIndicator
          style={styles.panelScrollView}
        >
          <SectionComponent />
        </ScrollView>
      </View>
    </SettingsScreenLayout>
  );
}

export function GlobalSettingsScreen() {
  return <SettingsSectionScreen sectionKey="global" />;
}

export function AppearanceSettingsScreen() {
  return <SettingsSectionScreen sectionKey="appearance" />;
}

export function WindowSettingsScreen() {
  return <SettingsSectionScreen sectionKey="window" />;
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
  metaPanel: {
    gap: 12,
    marginBottom: 16,
  },
  pageContainer: {
    alignSelf: "center",
    flex: 1,
    maxWidth: SCREEN_MAX_WIDTH,
    width: "100%",
  },
  pagePadding: {
    flex: 1,
    padding: 20,
  },
  page: {
    flex: 1,
  },
  panelHost: {
    flex: 1,
    minHeight: 0,
  },
  panelScrollContent: {
    paddingBottom: 20,
  },
  panelScrollView: {
    flex: 1,
    minHeight: 0,
  },
  safeArea: {
    flex: 1,
  },
  sectionCard: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  sectionCardText: {
    gap: 6,
  },
  sectionList: {
    gap: 16,
  },
  syncState: {
    minHeight: 0,
  },
});

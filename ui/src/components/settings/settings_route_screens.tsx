import { type Href, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isDesktop, isWeb } from "@/api/common";
import { useColorSchemeSettings, useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import { TitleBar } from "../titlebar";
import { NativeList, NativeListSection, NativeListNavigationItem, Text } from "../ui";
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
  if (!matchedDefinition) throw new Error(`Unknown settings route: ${key}`);
  return matchedDefinition;
}

const SETTINGS_MOBILE_HEADER_TITLES: Record<string, string> = {
  "settings/index": "设置",
  ...Object.fromEntries(
    SETTINGS_ROUTE_DEFINITIONS.map((d) => [String(d.href).slice(1), d.label]),
  ),
};

function getSettingsMobileHeaderTitle(routeName: string): string | null {
  return SETTINGS_MOBILE_HEADER_TITLES[routeName] ?? null;
}

type SettingsSyncSnapshot = { error: string | null; isLoading: boolean };

function mergeSettingsSyncState(...states: SettingsSyncSnapshot[]): SettingsSyncSnapshot {
  return {
    error: states.find((s) => s.error != null)?.error ?? null,
    isLoading: states.some((s) => s.isLoading),
  };
}

type ScreenLayoutProps = {
  children: ReactNode;
  error: string | null;
  isLoading: boolean;
  title: string;
};

function SettingsScreenLayout({ children, error, isLoading, title }: ScreenLayoutProps) {
  const desktop = isDesktop();
  const usesNativeHeader = !isWeb();
  const usesNativeSettingsList = Platform.OS === "ios";
  const showMeta = error != null || isLoading;

  return (
    <SafeAreaView
      edges={usesNativeSettingsList ? ["top", "left", "right"] : usesNativeHeader ? ["left", "right"] : ["top"]}
      style={styles.safeArea}
    >
      {desktop ? <TitleBar /> : null}
      <View style={styles.page}>
        <View style={usesNativeSettingsList ? styles.nativePagePadding : styles.pagePadding}>
          <View style={styles.pageContainer}>
            {!usesNativeHeader ? (
              <View style={styles.header}>
                <Text fontSize="$8" fontWeight="700">
                  {title}
                </Text>
                <View style={styles.syncState}>
                  <SettingsSyncState error={error} isLoading={isLoading} />
                </View>
              </View>
            ) : null}

            {usesNativeHeader && showMeta ? (
              <View style={styles.metaPanel}>
                <View style={styles.syncState}>
                  <SettingsSyncState error={error} isLoading={isLoading} />
                </View>
              </View>
            ) : null}

            {usesNativeSettingsList ? (
              <View style={[styles.content, styles.nativeContent]}>{children}</View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator
                style={styles.content}
              >
                {children}
              </ScrollView>
            )}
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
      return { error: uiPreferencesState.error, isLoading: uiPreferencesState.isLoading };
    default:
      return { error: globalSettingsState.error, isLoading: globalSettingsState.isLoading };
  }
}

export function SettingsHomeScreen() {
  const router = useRouter();
  const syncState = useSettingsHomeSyncState();

  return (
    <SettingsScreenLayout error={syncState.error} isLoading={syncState.isLoading} title="设置">
      <NativeList>
        <NativeListSection>
          {SETTINGS_ROUTE_DEFINITIONS.map((d) => (
            <NativeListNavigationItem
              key={d.key}
              onPress={() => router.push(d.href)}
              subtitle={d.description}
              title={d.label}
            />
          ))}
        </NativeListSection>
      </NativeList>
    </SettingsScreenLayout>
  );
}

function SettingsSectionScreen({ sectionKey }: { sectionKey: SettingsRouteKey }) {
  const definition = getSettingsRouteDefinition(sectionKey);
  const syncState = useSettingsSectionSyncState(sectionKey);
  const SectionComponent = definition.Component;
  const usesNativeSettingsList = Platform.OS === "ios";

  return (
    <SettingsScreenLayout error={syncState.error} isLoading={syncState.isLoading} title={definition.label}>
      <View style={styles.panelHost}>
        {usesNativeSettingsList ? (
          <View style={styles.panelScrollView}>
            <SectionComponent />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.panelScrollContent}
            showsVerticalScrollIndicator
            style={styles.panelScrollView}
          >
            <SectionComponent />
          </ScrollView>
        )}
      </View>
    </SettingsScreenLayout>
  );
}

export function GlobalSettingsScreen() {
  return <SettingsSectionScreen sectionKey="global" />;
}
export { getSettingsMobileHeaderTitle };
export function AppearanceSettingsScreen() {
  return <SettingsSectionScreen sectionKey="appearance" />;
}
export function WindowSettingsScreen() {
  return <SettingsSectionScreen sectionKey="window" />;
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0 },
  scrollContent: {},
  header: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 20, borderWidth: 1, gap: 16, marginBottom: 20, padding: 20,
  },
  metaPanel: { gap: 12, marginBottom: 16 },
  nativeContent: { flex: 1, width: "100%" },
  nativePagePadding: { flex: 1, paddingHorizontal: 0, paddingTop: 0 },
  pageContainer: { alignSelf: "center", flex: 1, maxWidth: SCREEN_MAX_WIDTH, width: "100%" },
  pagePadding: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  page: { flex: 1 },
  panelHost: { flex: 1, minHeight: 0 },
  panelScrollContent: {},
  panelScrollView: { flex: 1, minHeight: 0 },
  safeArea: { flex: 1 },
  syncState: { minHeight: 0 },
});

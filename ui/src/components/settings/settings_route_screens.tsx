import { type Href, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isDesktop } from "@/api/common";
import { useColorSchemeSettings, useGlobalSettings, useUiPreferences } from "@/hooks/settings";

import { TitleBar } from "../titlebar";
import { Button } from "../ui";
import {
  AppearanceSettingsPanel,
  GlobalSettingsPanel,
  SettingsSyncState,
  WindowSettingsPanel,
} from "./settings_panels";

const SCREEN_MAX_WIDTH = 960;
const HOME_HREF = "/" as Href;
const SETTINGS_HREF = "/settings" as Href;
const SETTINGS_APPEARANCE_HREF = "/settings/appearance" as Href;
const SETTINGS_WINDOW_HREF = "/settings/window" as Href;

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
    <SafeAreaView className="bg-background" edges={["top"]} style={{ flex: 1 }}>
      {desktop ? <TitleBar /> : null}
      <View className="flex-1 bg-background">
        <ScrollView contentContainerStyle={{ padding: 20 }} style={{ flex: 1 }}>
          <View style={{ alignSelf: "center", maxWidth: SCREEN_MAX_WIDTH, width: "100%" }}>
            <View className="mb-5 rounded-3xl border border-foreground/10 bg-accent/5 px-5 py-5">
              <Button onPress={() => router.replace(backHref)} size="sm" variant="ghost">
                {backHref === HOME_HREF ? "返回首页" : "返回设置"}
              </Button>
              <Text className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                {title}
              </Text>
              <View className="mt-4">
                <SettingsSyncState error={error} isLoading={isLoading} />
              </View>
            </View>

            {children}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function GlobalSettingsHomeScreen() {
  const router = useRouter();
  const globalSettingsState = useGlobalSettings();
  const uiPreferencesState = useUiPreferences();

  return (
    <SettingsScreenLayout
      backHref={HOME_HREF}
      error={globalSettingsState.error ?? uiPreferencesState.error}
      isLoading={globalSettingsState.isLoading || uiPreferencesState.isLoading}
      title="设置"
    >
      <GlobalSettingsPanel
        onSelectTab={(tab) => {
          if (tab === "appearance") {
            router.push(SETTINGS_APPEARANCE_HREF);
            return;
          }

          if (tab === "window") {
            router.push(SETTINGS_WINDOW_HREF);
            return;
          }
        }}
        showNavigation
      />
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
      <AppearanceSettingsPanel />
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
      <WindowSettingsPanel />
    </SettingsScreenLayout>
  );
}

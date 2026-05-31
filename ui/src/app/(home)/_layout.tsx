import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useTheme } from "tamagui";

import { isDesktop, os } from "@/api/common";
import { getDebugMobileHeaderTitle } from "@/components/debug";
import { getSettingsMobileHeaderTitle } from "@/components/settings";
import {
  nativeStackStatusBarOptions,
  sheetScreenOptions,
  usePageSheetGestureLockActive,
} from "@/components/ui";
import { WideScreenHome } from "@/components/home";
import { TitleBar } from "@/components/titlebar";
import { WIDE_LAYOUT_MINIMUM_WIDTH, getAppHomeTitle, getAppName, getVersion, initConfig } from "@/config";
import { useResolvedeColorScheme } from "@/hooks/settings";

export const unstable_settings = {
  anchor: "index",
};

export default function UILayout() {
  const { width } = useWindowDimensions();
  const desktop = isDesktop();
  const colorScheme = useResolvedeColorScheme();
  const pageSheetGestureLockActive = usePageSheetGestureLockActive();
  const theme = useTheme();

  useEffect(() => {
    const initialize = async () => {
      await initConfig();
      console.log(`inited, ${getAppName()} - ${getVersion()}.`);
    };
    initialize();
  }, []);

  if (width >= WIDE_LAYOUT_MINIMUM_WIDTH) {
    return <WideScreenHome />;
  }

  return (
    <>
      {desktop && <TitleBar />}
      <Stack
        screenOptions={({ route }) => {
          const stackBackgroundColor = theme.background.val;
          const baseScreenOptions = {
            ...nativeStackStatusBarOptions(colorScheme),
            contentStyle: {
              backgroundColor: stackBackgroundColor,
            },
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: stackBackgroundColor,
            },
          } as const;

          if (route.name === "index" && os() === "ios") {
            return {
              ...baseScreenOptions,
              headerShown: true,
              headerLargeTitle: true,
              headerLargeStyle: {
                backgroundColor: stackBackgroundColor,
              },
              headerLargeTitleShadowVisible: false,
              title: getAppHomeTitle(),
            };
          }

          if (route.name === "debug") {
            return sheetScreenOptions("card", {
              ...(os() === "ios" ? { gestureEnabled: !pageSheetGestureLockActive } : null),
              headerShown: false,
            });
          }

          if (route.name.startsWith("debug_page/")) {
            const debugPageTitle = getDebugMobileHeaderTitle(route.name);

            return {
              ...baseScreenOptions,
              headerShown: debugPageTitle != null,
              title: debugPageTitle ?? "调试",
            };
          }

          if (route.name.startsWith("settings/")) {
            const settingsTitle = getSettingsMobileHeaderTitle(route.name);

            return {
              ...baseScreenOptions,
              headerShown: settingsTitle != null,
              title: settingsTitle ?? "设置",
            };
          }

          return {
            ...baseScreenOptions,
            headerShown: false,
          };
        }}
      >
        <Stack.Screen name="index" options={{ title: getAppHomeTitle() }} />
        <Stack.Screen name="debug" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useTheme } from "tamagui";

import { isDesktop, os } from "@/api/common";
import { WideScreenHome } from "@/components/home";
import { getSettingsMobileHeaderTitle } from "@/components/settings";
import { TitleBar } from "@/components/titlebar";
import { nativeStackStatusBarOptions } from "@/components/ui";
import {
  WIDE_LAYOUT_MINIMUM_WIDTH,
  getAppHomeTitle,
  getAppName,
  getVersion,
  initConfig,
} from "@/config";
import { useResolvedeColorScheme } from "@/hooks/settings";

export const unstable_settings = {
  anchor: "index",
};

export default function UILayout() {
  const { width } = useWindowDimensions();
  const desktop = isDesktop();
  const colorScheme = useResolvedeColorScheme();
  const theme = useTheme();

  useEffect(() => {
    const initialize = async () => {
      await initConfig();
      console.log(`inited, ${getAppName()} - ${getVersion()}, ${os()}.`);
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
            headerTintColor: theme.accentColor.val,
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: stackBackgroundColor,
            },
          } as const;

          if (route.name === "index" && os() === "ios") {
            return {
              contentStyle: baseScreenOptions.contentStyle,
              headerTintColor: theme.accentColor.val,
              headerShadowVisible: false,
              headerShown: true,
              headerLargeTitle: true,
              headerLargeTitleShadowVisible: false,
              headerTransparent: true,
              title: getAppHomeTitle(),
            };
          }

          if (route.name.startsWith("settings/")) {
            const settingsTitle = getSettingsMobileHeaderTitle(route.name);

            return {
              ...baseScreenOptions,
              headerStyle: {
                backgroundColor: "transparent",
              },
              headerTransparent: true,
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
      </Stack>
    </>
  );
}

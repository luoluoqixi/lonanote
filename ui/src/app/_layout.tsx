// sort-imports-ignore
import "../initialize";

import { Stack } from "expo-router";
import { useEffect } from "react";

import { isWeb, os } from "@/api/common";
import { initializeRustRuntime } from "@/api/invoke";
import {
  AppStatusBar,
  nativeStackStatusBarOptions,
  resolveNativeStackStatusBarStyle,
  withNativeStackGestureOptions,
} from "rn-ui-kit";
import { getAppHomeTitle, getAppName, getVersion, initConfig } from "@/config";
import { AppProvider } from "@/providers/app_provider";
import { useAppBackgroundColors, useResolvedeColorScheme } from "@/hooks/settings";
import { applyThemeBootstrap } from "@/stores/ui";

applyThemeBootstrap();
initializeRustRuntime();

export default function RootLayout() {
  useEffect(() => {
    const initialize = async () => {
      await initConfig();
      console.log(`inited, ${getAppName()} - ${getVersion()}, ${os()}.`);
    };

    void initialize();
  }, []);

  return (
    <AppProvider>
      <RootNavigation />
    </AppProvider>
  );
}

function RootNavigation() {
  const colorScheme = useResolvedeColorScheme();
  const appBackgroundColors = useAppBackgroundColors();
  const rootBackgroundColor = appBackgroundColors.screen;

  return (
    <>
      <AppStatusBar colorScheme={colorScheme} />
      <Stack
        screenOptions={() => {
          const statusBar = nativeStackStatusBarOptions(colorScheme);
          const statusBarStyle = resolveNativeStackStatusBarStyle(colorScheme);

          if (isWeb()) {
            return {
              ...statusBar,
              contentStyle: {
                backgroundColor: rootBackgroundColor,
              },
              headerShown: false,
            };
          }

          return withNativeStackGestureOptions({
            ...statusBar,
            statusBarStyle,
            contentStyle: {
              backgroundColor: rootBackgroundColor,
            },
            headerShown: false,
          });
        }}
      >
        <Stack.Screen name="(main)" options={{ title: getAppHomeTitle() }} />
        <Stack.Screen name="debug" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

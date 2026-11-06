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
import { initializeConfigSyncController } from "@/api/common/config_sync_controller";
import { useDesktopWindowLifecycle } from "@/hooks/editor/use_desktop_window_lifecycle";

applyThemeBootstrap();
initializeRustRuntime();

export default function RootLayout() {
  useEffect(() => {
    let disposed = false;
    let disposeConfigSync: (() => void) | undefined;
    const initialize = async () => {
      disposeConfigSync = await initializeConfigSyncController();
      if (disposed) {
        disposeConfigSync();
        return;
      }
      await initConfig();
      console.log(`inited, ${getAppName()} - ${getVersion()}, ${os()}.`);
    };

    void initialize().catch((error) => console.error("[startup] 初始化失败", error));
    return () => {
      disposed = true;
      disposeConfigSync?.();
    };
  }, []);

  return (
    <AppProvider>
      <RootNavigation />
    </AppProvider>
  );
}

function RootNavigation() {
  useDesktopWindowLifecycle();
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

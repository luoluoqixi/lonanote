// sort-imports-ignore
import "../initialize";

import { View, Pressable } from "react-native";
import { editorWindowService } from "@/components/editor/controllers/editor_window_service";
import { Stack } from "expo-router";
import { useEffect } from "react";

import { isWeb, os } from "@/api/common";
import { initializeRustRuntime } from "@/api/invoke";
import {
  AppStatusBar,
  Text,
  nativeStackStatusBarOptions,
  resolveNativeStackStatusBarStyle,
  withNativeStackGestureOptions,
} from "rn-ui-kit";
import { getAppHomeTitle, getAppName, getVersion, initConfig } from "@/config";
import { AppProvider } from "@/providers/app_provider";
import { useAppBackgroundColors, useResolvedeColorScheme } from "@/hooks/settings";
import { applyThemeBootstrap } from "@/stores/ui";
import { initializeConfigSyncController } from "@/api/common/config_sync_controller";
import { AuxiliaryEditorShell } from "@/components/app_shell/auxiliary_editor_shell";
import { useEditorWindows } from "@/hooks/editor/use_editor_windows";
import { useDesktopWindowLifecycle } from "@/hooks/editor/use_desktop_window_lifecycle";
import { useDesktopWindowTitle } from "@/hooks/editor/use_desktop_window_title";

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
  const editorWindow = useEditorWindows();
  useDesktopWindowTitle(editorWindow.ready);
  if (!editorWindow.ready)
    return editorWindow.error ? (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text accessibilityRole="alert">编辑器窗口初始化失败：{editorWindow.error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void editorWindowService.retry().catch(console.error)}
        >
          <Text>重试</Text>
        </Pressable>
      </View>
    ) : null;
  if (editorWindow.role === "editor") return <AuxiliaryEditorShell />;
  return <WorkbenchNavigation />;
}

function WorkbenchNavigation() {
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

import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";

import { isDesktop, os } from "@/api/common";
import { getDebugStackHeaderTitle } from "@/components/debug";
import {
  nativeStackStatusBarOptions,
  sheetScreenOptions,
  usePageSheetGestureLockActive,
} from "@/components/ui";
import { WideScreenHome } from "@/components/home";
import { TitleBar } from "@/components/titlebar";
import { WIDE_LAYOUT_MINIMUM_WIDTH, getAppName, getVersion, initConfig } from "@/config";
import { useResolvedeColorScheme } from "@/hooks/settings";

export const unstable_settings = {
  anchor: "index",
};

export default function UILayout() {
  const { width } = useWindowDimensions();
  const desktop = isDesktop();
  const colorScheme = useResolvedeColorScheme();
  const pageSheetGestureLockActive = usePageSheetGestureLockActive();

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
          if (route.name === "debug") {
            return sheetScreenOptions("card", {
              ...(os() === "ios" ? { gestureEnabled: !pageSheetGestureLockActive } : null),
              headerShown: false,
            });
          }

          if (route.name === "debug_page") {
            const focusedRouteName = getFocusedRouteNameFromRoute(route) ?? "index";
            const isDebugPageRoot = focusedRouteName === "index";

            return {
              ...nativeStackStatusBarOptions(colorScheme),
              // 让父级 Stack 自己给 `debug_page/index` 渲染原生返回按钮；
              // 子级 `debug_page/_layout` 只负责它自己的子页面 header。
              headerShown: isDebugPageRoot,
              title: getDebugStackHeaderTitle(focusedRouteName) ?? "调试",
            };
          }

          return {
            ...nativeStackStatusBarOptions(colorScheme),
            headerShown: false,
          };
        }}
      >
        <Stack.Screen name="index" options={{ title: getAppName() }} />
        <Stack.Screen name="debug" options={{ headerShown: false }} />
        <Stack.Screen name="debug_page" />
      </Stack>
    </>
  );
}

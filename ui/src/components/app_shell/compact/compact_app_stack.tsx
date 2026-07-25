import { Stack } from "expo-router";
import {
  getNativeStackScrollEdgeHeaderOptions,
  nativeStackStatusBarOptions,
  useTheme,
  withNativeBackButton,
  withNativeStackGestureOptions,
} from "rn-ui-kit";

import { isDesktop, os } from "@/api/common";
import { getSettingsMobileHeaderTitle } from "@/components/settings";
import { TitleBar } from "@/components/window_chrome";
import { getAppHomeTitle } from "@/config";
import { useAppBackgroundColors, useResolvedeColorScheme } from "@/hooks/settings";

const compactRouteTitles = new Map([
  ["editor/[editorId]", "编辑器"],
  ["media/[viewerId]", "媒体查看器"],
  ["recent", "最近文档"],
  ["workspaces/index", "工作区"],
]);

export function CompactAppStack() {
  const desktop = isDesktop();
  const colorScheme = useResolvedeColorScheme();
  const appBackgroundColors = useAppBackgroundColors();
  const theme = useTheme();

  return (
    <>
      {desktop ? <TitleBar /> : null}
      <Stack
        screenOptions={({ navigation, route }) => {
          const stackBackgroundColor = appBackgroundColors.screen;
          const headerBackgroundColor = appBackgroundColors.header;
          const headerTitleColor = theme.gray12.val;
          const nativeStackScrollEdgeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
            headerBackgroundColor,
            screenBackgroundColor: stackBackgroundColor,
          });
          const scrollEdgeHeaderOptions = {
            headerBackButtonDisplayMode:
              nativeStackScrollEdgeHeaderOptions.headerBackButtonDisplayMode,
            headerBackButtonMenuEnabled:
              nativeStackScrollEdgeHeaderOptions.headerBackButtonMenuEnabled,
            headerBlurEffect: nativeStackScrollEdgeHeaderOptions.headerBlurEffect,
            headerLargeStyle: nativeStackScrollEdgeHeaderOptions.headerLargeStyle,
            headerShadowVisible: nativeStackScrollEdgeHeaderOptions.headerShadowVisible,
            headerStyle: nativeStackScrollEdgeHeaderOptions.headerStyle,
            headerTransparent: nativeStackScrollEdgeHeaderOptions.headerTransparent,
          };
          const baseScreenOptions = {
            ...nativeStackStatusBarOptions(colorScheme),
            contentStyle: {
              backgroundColor: stackBackgroundColor,
            },
            ...scrollEdgeHeaderOptions,
            headerTintColor: theme.color10.val,
            headerTitleStyle: {
              color: headerTitleColor,
            },
          } as const;

          if (route.name === "index" && os() === "ios") {
            return withNativeStackGestureOptions({
              ...baseScreenOptions,
              headerShown: true,
              headerLargeTitle: true,
              headerLargeTitleStyle: {
                color: headerTitleColor,
              },
              headerLargeTitleShadowVisible: false,
              headerTitleStyle: {
                color: headerTitleColor,
              },
              title: getAppHomeTitle(),
            });
          }

          if (route.name.startsWith("settings/")) {
            const settingsTitle = getSettingsMobileHeaderTitle(route.name);
            const settingsScreenOptions = withNativeStackGestureOptions({
              ...baseScreenOptions,
              headerShown: settingsTitle != null,
              title: settingsTitle ?? "设置",
            });

            return withNativeBackButton(settingsScreenOptions, {
              label: getAppHomeTitle(),
              onPress: () => navigation.goBack(),
            });
          }

          const compactRouteTitle = compactRouteTitles.get(route.name);
          if (compactRouteTitle != null) {
            const compactScreenOptions = withNativeStackGestureOptions({
              ...baseScreenOptions,
              headerShown: true,
              title: compactRouteTitle,
            });

            return withNativeBackButton(compactScreenOptions, {
              label: getAppHomeTitle(),
              onPress: () => navigation.goBack(),
            });
          }

          return withNativeStackGestureOptions({
            ...baseScreenOptions,
            headerShown: false,
          });
        }}
      >
        <Stack.Screen name="index" options={{ title: getAppHomeTitle() }} />
      </Stack>
    </>
  );
}

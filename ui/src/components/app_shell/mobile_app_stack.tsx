import { Stack } from "expo-router";
import {
  getNativeStackScrollEdgeHeaderOptions,
  nativeStackStatusBarOptions,
  useTheme,
  withNativeStackGestureOptions,
} from "rn-ui-kit";

import { isDesktop, os } from "@/api/common";
import { TitleBar } from "@/components/window/titlebar";
import { getAppHomeTitle } from "@/config";
import { useAppBackgroundColors, useResolvedeColorScheme } from "@/hooks/settings";

export function MobileAppStack() {
  const desktop = isDesktop();
  const colorScheme = useResolvedeColorScheme();
  const appBackgroundColors = useAppBackgroundColors();
  const theme = useTheme();

  return (
    <>
      {desktop ? <TitleBar /> : null}
      <Stack
        screenOptions={({ route }) => {
          const stackBackgroundColor = appBackgroundColors.screen;
          const headerBackgroundColor = appBackgroundColors.header;
          const headerTitleColor = theme.gray12.val;
          const nativeHeaderOptions = getNativeStackScrollEdgeHeaderOptions({
            headerBackgroundColor,
            screenBackgroundColor: stackBackgroundColor,
          });
          const baseScreenOptions = {
            ...nativeStackStatusBarOptions(colorScheme),
            contentStyle: {
              backgroundColor: stackBackgroundColor,
            },
            headerBackButtonDisplayMode: nativeHeaderOptions.headerBackButtonDisplayMode,
            headerBackButtonMenuEnabled: nativeHeaderOptions.headerBackButtonMenuEnabled,
            headerBlurEffect: nativeHeaderOptions.headerBlurEffect,
            headerLargeStyle: nativeHeaderOptions.headerLargeStyle,
            headerShadowVisible: nativeHeaderOptions.headerShadowVisible,
            headerStyle: nativeHeaderOptions.headerStyle,
            headerTintColor: theme.color10.val,
            headerTitleStyle: {
              color: headerTitleColor,
            },
            headerTransparent: nativeHeaderOptions.headerTransparent,
          } as const;

          if (route.name === "index" && os() === "ios") {
            return withNativeStackGestureOptions({
              ...baseScreenOptions,
              headerLargeTitle: true,
              headerLargeTitleEnabled: true,
              headerLargeTitleShadowVisible: false,
              headerShown: true,
              title: getAppHomeTitle(),
            });
          }

          return withNativeStackGestureOptions({
            ...baseScreenOptions,
            headerShown: true,
          });
        }}
      >
        <Stack.Screen name="index" options={{ title: getAppHomeTitle() }} />
      </Stack>
    </>
  );
}

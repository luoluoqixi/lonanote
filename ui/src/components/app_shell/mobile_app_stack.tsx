import { Stack } from "expo-router";
import {
  getNativeStackScrollEdgeHeaderOptions,
  nativeStackStatusBarOptions,
  useTheme,
  withNativeBackButton,
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
        screenOptions={({ navigation, route }) => {
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
              headerLargeTitleShadowVisible: false,
              headerLargeTitleStyle: {
                color: headerTitleColor,
              },
              headerShown: true,
              title: getAppHomeTitle(),
            });
          }

          if (route.name.startsWith("settings/")) {
            const settingsOptions = withNativeStackGestureOptions({
              ...baseScreenOptions,
              headerShown: true,
              title: route.name === "settings/index" ? "设置" : undefined,
            });

            return withNativeBackButton(settingsOptions, {
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

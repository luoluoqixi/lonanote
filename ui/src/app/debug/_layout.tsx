import { Redirect, Stack } from "expo-router";
import { Platform } from "react-native";
import { useTheme } from "tamagui";

import {
  getDebugPanelRouteDefinition,
  isDebugFeatureEnabled,
  isDebugTabKey,
} from "@/components/debug";
import {
  getIosTransparentHeaderFallbackOptions,
  nativeStackStatusBarOptions,
  withNativeBackButton,
  withNativeStackGestureOptions,
} from "@/components/ui/utils/navigation";
import { useResolvedeColorScheme } from "@/hooks/settings";

export default function DebugStackLayout() {
  const colorScheme = useResolvedeColorScheme();
  const theme = useTheme();

  if (!isDebugFeatureEnabled()) {
    return <Redirect href="/" />;
  }

  const stackBackgroundColor = theme.background.val;
  const transparentHeaderFallback = getIosTransparentHeaderFallbackOptions();

  return (
    <Stack
      screenOptions={({ navigation, route }) => {
        if (route.name === "index") {
          return withNativeStackGestureOptions({
            ...nativeStackStatusBarOptions(colorScheme),
            contentStyle: {
              backgroundColor: stackBackgroundColor,
            },
            headerTintColor: theme.accentColor.val,
            headerShadowVisible: false,
            headerShown: true,
            headerStyle: {
              backgroundColor: Platform.OS === "ios" ? "transparent" : stackBackgroundColor,
            },
            headerTitleStyle: {
              color: theme.color.val,
            },
            headerTransparent: Platform.OS === "ios",
            ...transparentHeaderFallback,
            title: "调试面板",
          });
        }

        const sectionParam = (route.params as { section?: string } | undefined)?.section;
        const section = typeof sectionParam === "string" ? sectionParam : undefined;
        const title =
          section != null && isDebugTabKey(section)
            ? getDebugPanelRouteDefinition(section).label
            : "调试";

        return withNativeBackButton(
          withNativeStackGestureOptions({
            ...nativeStackStatusBarOptions(colorScheme),
            contentStyle: {
              backgroundColor: stackBackgroundColor,
            },
            headerTintColor: theme.accentColor.val,
            headerShadowVisible: false,
            headerShown: true,
            headerStyle: {
              backgroundColor: Platform.OS === "ios" ? "transparent" : stackBackgroundColor,
            },
            headerTitleStyle: {
              color: theme.color.val,
            },
            headerTransparent: Platform.OS === "ios",
            ...transparentHeaderFallback,
            title,
          }),
          {
            label: "调试面板",
            onPress: () => navigation.goBack(),
          },
        );
      }}
    />
  );
}

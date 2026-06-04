import { Redirect, Stack } from "expo-router";
import { useTheme } from "tamagui";

import {
  getDebugPanelRouteDefinition,
  isDebugFeatureEnabled,
  isDebugTabKey,
} from "@/components/debug";
import { nativeStackStatusBarOptions } from "@/components/ui/utils/navigation";
import { useResolvedeColorScheme } from "@/hooks/settings";

export default function DebugStackLayout() {
  const colorScheme = useResolvedeColorScheme();
  const theme = useTheme();

  if (!isDebugFeatureEnabled()) {
    return <Redirect href="/" />;
  }

  const stackBackgroundColor = theme.background.val;

  return (
    <Stack
      screenOptions={({ route }) => {
        if (route.name === "index") {
          return {
            ...nativeStackStatusBarOptions(colorScheme),
            contentStyle: {
              backgroundColor: stackBackgroundColor,
            },
            headerShadowVisible: false,
            headerShown: true,
            headerStyle: {
              backgroundColor: stackBackgroundColor,
            },
            title: "调试面板",
          };
        }

        const sectionParam = (route.params as { section?: string } | undefined)?.section;
        const section = typeof sectionParam === "string" ? sectionParam : undefined;
        const title =
          section != null && isDebugTabKey(section)
            ? getDebugPanelRouteDefinition(section).label
            : "调试";

        return {
          ...nativeStackStatusBarOptions(colorScheme),
          contentStyle: {
            backgroundColor: stackBackgroundColor,
          },
          headerShadowVisible: false,
          headerShown: true,
          headerStyle: {
            backgroundColor: stackBackgroundColor,
          },
          title,
        };
      }}
    />
  );
}

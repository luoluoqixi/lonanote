import { Stack } from "expo-router";

import { getDebugStackHeaderTitle } from "@/components/debug";
import { nativeStackStatusBarOptions } from "@/components/ui";
import { useResolvedeColorScheme } from "@/hooks/settings";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function DebugPageLayout() {
  const colorScheme = useResolvedeColorScheme();

  return (
    <Stack
      screenOptions={({ route }) => {
        const title = getDebugStackHeaderTitle(route.name);

        return {
          ...nativeStackStatusBarOptions(colorScheme),
          headerShown: title != null,
          title: title ?? "调试",
        };
      }}
    />
  );
}

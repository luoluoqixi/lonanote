import { Stack } from "expo-router";

import { getDebugStackHeaderTitle } from "@/components/debug";
import { nativeStackSheetStatusBarOptions } from "@/components/ui";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function DebugLayout() {
  return (
    <Stack
      screenOptions={({ route }) => {
        const title = getDebugStackHeaderTitle(route.name);

        return {
          ...nativeStackSheetStatusBarOptions(),
          headerShown: title != null,
          title: title ?? "调试",
        };
      }}
    />
  );
}

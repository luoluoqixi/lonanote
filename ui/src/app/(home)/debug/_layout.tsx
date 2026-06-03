import { Stack } from "expo-router";

import { getDebugStackHeaderTitle } from "@/components/debug";
import { ScreenOverlayPortalProvider, nativeStackSheetStatusBarOptions } from "@/components/ui";

export const DEBUG_SCREEN_OVERLAY_PORTAL_HOST = "debug-screen-overlay";

export const unstable_settings = {
  initialRouteName: "index",
};

function DebugStackLayout() {
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

export default function DebugLayout() {
  return (
    <ScreenOverlayPortalProvider hostName={DEBUG_SCREEN_OVERLAY_PORTAL_HOST}>
      <DebugStackLayout />
    </ScreenOverlayPortalProvider>
  );
}

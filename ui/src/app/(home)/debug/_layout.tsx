import { Stack } from "expo-router";

import { getDebugStackHeaderTitle } from "@/components/debug";
import { ScreenOverlayPortalProvider, nativeStackSheetStatusBarOptions } from "@/components/ui";
import { DEBUG_SCREEN_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";

export { DEBUG_SCREEN_OVERLAY_PORTAL_HOST };

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

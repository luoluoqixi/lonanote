// sort-imports-ignore
import "../initialize";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { isWeb } from "@/api/common";
import {
  DebugPanelGestureLayer,
  DebugPanelHost,
  getDebugMobileHeaderTitle,
} from "@/components/debug";
import { getSettingsMobileHeaderTitle } from "@/components/settings";
import { RootProvider } from "@/components/ui";
import { getAppName } from "@/config";
import { useResolvedeColorScheme } from "@/hooks/settings";
import { applyThemeBootstrap } from "@/stores/ui";

applyThemeBootstrap();

export default function RootLayout() {
  const colorScheme = useResolvedeColorScheme();
  return (
    <RootProvider>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <DebugPanelGestureLayer>
        <Stack
          screenOptions={({ route }) => {
            if (isWeb()) {
              return {
                headerShown: false,
              };
            }

            const debugTitle = getDebugMobileHeaderTitle(route.name);
            if (debugTitle != null) {
              return {
                headerShown: true,
                title: debugTitle,
              };
            }

            const settingsTitle = getSettingsMobileHeaderTitle(route.name);
            if (settingsTitle != null) {
              return {
                headerShown: true,
                title: settingsTitle,
              };
            }

            return {
              headerShown: false,
            };
          }}
        >
          <Stack.Screen name="(home)" options={{ title: getAppName() }} />
        </Stack>
        <DebugPanelHost />
      </DebugPanelGestureLayer>
    </RootProvider>
  );
}

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
            const debugTitle = getDebugMobileHeaderTitle(route.name);
            if (debugTitle != null && !isWeb()) {
              return {
                headerShown: true,
                title: debugTitle,
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

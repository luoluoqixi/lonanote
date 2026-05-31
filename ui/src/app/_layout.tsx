// sort-imports-ignore
import "../initialize";

import { Stack } from "expo-router";

import { isWeb } from "@/api/common";
import { DebugPanelGestureLayer, DebugPanelHost } from "@/components/debug";
import { getSettingsMobileHeaderTitle } from "@/components/settings";
import { AppStatusBar, RootProvider, nativeStackStatusBarOptions } from "@/components/ui";
import { getAppName } from "@/config";
import { useResolvedeColorScheme } from "@/hooks/settings";
import { applyThemeBootstrap } from "@/stores/ui";

applyThemeBootstrap();

export default function RootLayout() {
  const colorScheme = useResolvedeColorScheme();
  return (
    <RootProvider>
      <AppStatusBar colorScheme={colorScheme} />
      <DebugPanelGestureLayer>
        <Stack
          screenOptions={({ route }) => {
            const statusBar = nativeStackStatusBarOptions(colorScheme);

            if (isWeb()) {
              return {
                ...statusBar,
                headerShown: false,
              };
            }

            const settingsTitle = getSettingsMobileHeaderTitle(route.name);
            if (settingsTitle != null) {
              return {
                ...statusBar,
                headerShown: true,
                title: settingsTitle,
              };
            }

            return {
              ...statusBar,
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

// sort-imports-ignore
import "../initialize";

import { Stack } from "expo-router";

import { isWeb } from "@/api/common";
import { DebugPanelGestureLayer, DebugPanelHost, TrueSheetDebugHost } from "@/components/debug";
import { AppStatusBar, RootProvider, nativeStackStatusBarOptions } from "@/components/ui";
import { getAppHomeTitle } from "@/config";
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

            return {
              ...statusBar,
              headerShown: false,
            };
          }}
        >
          <Stack.Screen name="(home)" options={{ title: getAppHomeTitle() }} />
        </Stack>
        <DebugPanelHost />
        {__DEV__ ? <TrueSheetDebugHost /> : null}
      </DebugPanelGestureLayer>
    </RootProvider>
  );
}

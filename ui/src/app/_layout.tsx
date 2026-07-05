// sort-imports-ignore
import "../initialize";

import { Stack } from "expo-router";

import { isWeb } from "@/api/common";
import { DebugRuntime } from "@/components/debug";
import {
  AppStatusBar,
  RootProvider,
  nativeStackStatusBarOptions,
  withNativeStackGestureOptions,
} from "@/components/ui";
import { getAppHomeTitle } from "@/config";
import { useResolvedeColorScheme } from "@/hooks/settings";
import { applyThemeBootstrap } from "@/stores/ui";
import { getAppWindowBackgroundColor } from "@/theme/window_background";

applyThemeBootstrap();

export default function RootLayout() {
  const colorScheme = useResolvedeColorScheme();
  const rootBackgroundColor = getAppWindowBackgroundColor(colorScheme);
  return (
    <RootProvider>
      <AppStatusBar colorScheme={colorScheme} />
      <DebugRuntime>
        <Stack
          screenOptions={() => {
            const statusBar = nativeStackStatusBarOptions(colorScheme);

            if (isWeb()) {
              return {
                ...statusBar,
                contentStyle: {
                  backgroundColor: rootBackgroundColor,
                },
                headerShown: false,
              };
            }

            return withNativeStackGestureOptions({
              ...statusBar,
              contentStyle: {
                backgroundColor: rootBackgroundColor,
              },
              headerShown: false,
            });
          }}
        >
          <Stack.Screen name="(home)" options={{ title: getAppHomeTitle() }} />
          <Stack.Screen name="debug" options={{ headerShown: false }} />
        </Stack>
      </DebugRuntime>
    </RootProvider>
  );
}

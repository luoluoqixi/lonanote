// sort-imports-ignore
import "../initialize";

import { Stack } from "expo-router";

import { isWeb } from "@/api/common";
import {
  AppStatusBar,
  nativeStackStatusBarOptions,
  withNativeStackGestureOptions,
} from "rn-ui-kit";
import { getAppHomeTitle } from "@/config";
import { AppProvider } from "@/providers/app_provider";
import { useResolvedeColorScheme } from "@/hooks/settings";
import { applyThemeBootstrap } from "@/stores/ui";
import { getAppWindowBackgroundColor } from "@/theme/window_background";

applyThemeBootstrap();

export default function RootLayout() {
  const colorScheme = useResolvedeColorScheme();
  const rootBackgroundColor = getAppWindowBackgroundColor(colorScheme);
  return (
    <AppProvider>
      <AppStatusBar colorScheme={colorScheme} />
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
    </AppProvider>
  );
}

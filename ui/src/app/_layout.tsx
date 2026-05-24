// sort-imports-ignore
import "../initialize";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { DebugPanelGestureLayer, DebugPanelHost } from "@/components/debug";
import { RootProvider } from "@/components/ui";
import { useResolvedeColorScheme } from "@/hooks/settings";
import { applyThemeBootstrap } from "@/stores/ui";

applyThemeBootstrap();

export default function RootLayout() {
  const colorScheme = useResolvedeColorScheme();
  return (
    <RootProvider>
      <StatusBar style={colorScheme} />
      <DebugPanelGestureLayer>
        <Stack screenOptions={{ headerShown: false }} />
        <DebugPanelHost />
      </DebugPanelGestureLayer>
    </RootProvider>
  );
}

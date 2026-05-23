import { Stack } from "expo-router";

import { DebugPanelGestureLayer, DebugPanelHost } from "@/components/debug";
import { RootProvider } from "@/components/ui";
import { applyThemeBootstrap } from "@/stores/ui";

import "../initialize";

applyThemeBootstrap();

export default function RootLayout() {
  return (
    <RootProvider>
      <DebugPanelGestureLayer>
        <Stack screenOptions={{ headerShown: false }} />
        <DebugPanelHost />
      </DebugPanelGestureLayer>
    </RootProvider>
  );
}

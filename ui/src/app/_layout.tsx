import { Stack } from "expo-router";

import { DebugPanelHost } from "@/components/debug";
import { RootProvider } from "@/components/ui";
import { applyThemeBootstrap } from "@/stores/ui";

import "../initialize";

applyThemeBootstrap();

export default function RootLayout() {
  return (
    <RootProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <DebugPanelHost />
    </RootProvider>
  );
}

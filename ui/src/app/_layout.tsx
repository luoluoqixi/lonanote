import { Stack } from "expo-router";

import { RootProvider } from "@/components/ui";

import "../global.css";

export default function RootLayout() {
  return (
    <RootProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RootProvider>
  );
}

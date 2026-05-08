import { Stack } from "expo-router";

import { TitleBar } from "@/components/titlebar";
import { RootProvider } from "@/components/ui";

import "../global.css";

export default function RootLayout() {
  return (
    <RootProvider>
      <TitleBar />
      <Stack screenOptions={{ headerShown: false }} />
    </RootProvider>
  );
}

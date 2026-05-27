import { Stack } from "expo-router";

import { isWeb } from "@/api/common";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: !isWeb() }}>
      <Stack.Screen name="index" options={{ title: "设置" }} />
      <Stack.Screen name="global" options={{ title: "全局设置" }} />
      <Stack.Screen name="appearance" options={{ title: "外观设置" }} />
      <Stack.Screen name="window" options={{ title: "窗口设置" }} />
    </Stack>
  );
}

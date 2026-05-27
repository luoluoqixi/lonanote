import { Stack } from "expo-router";

import { isWeb } from "@/api/common";

export default function DebugLayout() {
  return (
    <Stack screenOptions={{ headerShown: !isWeb() }}>
      <Stack.Screen name="index" options={{ title: "调试面板" }} />
      <Stack.Screen name="workspace" options={{ title: "工作区" }} />
      <Stack.Screen name="path" options={{ title: "路径" }} />
      <Stack.Screen name="components" options={{ title: "组件总览" }} />
    </Stack>
  );
}

import { Redirect, Stack } from "expo-router";

import { useCurrentWorkspaceId } from "@/hooks/workspace";

export default function WorkspaceLayout() {
  const currentWorkspaceId = useCurrentWorkspaceId();

  if (!currentWorkspaceId) {
    return <Redirect href="/workspaces" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "工作区" }} />
      <Stack.Screen name="explorer/index" options={{ title: "文件" }} />
      <Stack.Screen name="explorer/[...path]" options={{ title: "文件" }} />
      <Stack.Screen name="search" options={{ title: "搜索" }} />
      <Stack.Screen name="settings" options={{ title: "工作区设置" }} />
    </Stack>
  );
}

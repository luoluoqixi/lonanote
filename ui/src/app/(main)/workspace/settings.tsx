import { Redirect, Stack } from "expo-router";

import { os } from "@/api/common";
import { CurrentWorkspaceSettingsPage } from "@/components/settings/pages/current_workspace_settings_page";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

export default function WorkspaceSettingsRoute() {
  const currentWorkspaceId = useCurrentWorkspaceId();
  const currentOs = os();
  const tracksNavigationBarScrollEdge = currentOs === "ios" || currentOs === "android";

  if (!currentWorkspaceId) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "工作区设置" }} />
      <CurrentWorkspaceSettingsPage tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge} />
    </>
  );
}

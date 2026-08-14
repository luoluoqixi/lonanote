import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";

import { os } from "@/api/common";
import { useUiPreferences } from "@/hooks/settings";

import { getSettingsPage } from "../settings_config";

export function MobileSettingsPage() {
  const router = useRouter();
  const { preferences } = useUiPreferences();
  const { page } = useLocalSearchParams<{ page?: string | string[] }>();
  const pageId = Array.isArray(page) ? page[0] : page;
  const pageConfig = getSettingsPage(pageId);
  const currentOs = os();
  const tracksNavigationBarScrollEdge = currentOs === "ios" || currentOs === "android";

  if (
    !pageConfig ||
    (pageConfig.requiresDeveloperOptions &&
      !preferences.developer.optionsEnabled &&
      pageConfig.id !== "developer")
  ) {
    return <Redirect href="/settings" />;
  }

  const PageComponent = pageConfig.Component;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: pageConfig.title }} />
      <PageComponent
        onLayoutModeChange={(layoutMode) => {
          if (layoutMode === "desktop") {
            router.replace("/");
          }
        }}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
      />
    </>
  );
}

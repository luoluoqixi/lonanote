import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";

import { os } from "@/api/common";
import { useUiPreferences } from "@/hooks/settings";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

import { type SettingsPageId, getSettingsPage } from "../settings_config";

export function MobileSettingsPage() {
  const router = useRouter();
  const { preferences } = useUiPreferences();
  const currentWorkspaceId = useCurrentWorkspaceId();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const { page } = params;
  const pageParams = Object.fromEntries(
    Object.entries(params)
      .filter(([key]) => key !== "page")
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const pageId = Array.isArray(page) ? page[0] : page;
  const pageConfig = getSettingsPage(pageId);
  const currentOs = os();
  const tracksNavigationBarScrollEdge = currentOs === "ios" || currentOs === "android";

  if (
    !pageConfig ||
    (pageConfig.requiresWorkspace && !currentWorkspaceId) ||
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
        pageParams={pageParams}
        onBack={() => router.back()}
        onNavigate={(id: SettingsPageId, nextParams) =>
          router.push({ pathname: "/settings/[page]", params: { ...nextParams, page: id } })
        }
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

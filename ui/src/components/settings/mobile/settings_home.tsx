import { type Href, Stack, useRouter } from "expo-router";
import { NativeListNavigationItem, NativeListSection } from "rn-ui-kit";

import { os } from "@/api/common";
import { useUiPreferences } from "@/hooks/settings";
import { useCurrentWorkspaceId, useCurrentWorkspaceState } from "@/hooks/workspace";

import { mobileSettingsSections, settingsPages } from "../settings_config";
import { SettingsList } from "../settings_list";

export function MobileSettingsHome() {
  const router = useRouter();
  const { preferences } = useUiPreferences();
  const currentWorkspaceId = useCurrentWorkspaceId();
  const { state: currentWorkspace } = useCurrentWorkspaceState();
  const currentOs = os();
  const tracksNavigationBarScrollEdge = currentOs === "ios" || currentOs === "android";

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "设置" }} />
      <SettingsList
        style={{ flex: 1 }}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
      >
        {mobileSettingsSections.map((section) => {
          if (section.id === "workspace" && !currentWorkspaceId) {
            return null;
          }

          const sectionTitle =
            section.id === "workspace" && currentWorkspace?.displayName
              ? `工作区 - ${currentWorkspace.displayName}`
              : section.title;

          return (
            <NativeListSection key={section.id} title={sectionTitle}>
              {section.id === "workspace" ? (
                <NativeListNavigationItem
                  onPress={() => router.push("/workspace/settings" as Href)}
                  title="工作区设置"
                />
              ) : (
                settingsPages
                  .filter(
                    (page) =>
                      page.mobileSection === section.id &&
                      (!page.requiresDeveloperOptions || preferences.developer.optionsEnabled),
                  )
                  .map((page) => (
                    <NativeListNavigationItem
                      key={page.id}
                      onPress={() => router.push(`/settings/${page.id}` as Href)}
                      title={page.title}
                    />
                  ))
              )}
            </NativeListSection>
          );
        })}
      </SettingsList>
    </>
  );
}

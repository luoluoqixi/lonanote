import { type Href, Stack, useRouter } from "expo-router";
import { NativeListNavigationItem, NativeListSection } from "rn-ui-kit";

import { os } from "@/api/common";
import { useUiPreferences } from "@/hooks/settings";

import { mobileSettingsSections, settingsPages } from "../settings_config";
import { SettingsList } from "../settings_list";

export function MobileSettingsHome() {
  const router = useRouter();
  const { preferences } = useUiPreferences();
  const currentOs = os();
  const tracksNavigationBarScrollEdge = currentOs === "ios" || currentOs === "android";

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "设置" }} />
      <SettingsList
        style={{ flex: 1 }}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
      >
        {mobileSettingsSections.map((section) => (
          <NativeListSection key={section.id} title={section.title}>
            {settingsPages
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
              ))}
          </NativeListSection>
        ))}
      </SettingsList>
    </>
  );
}

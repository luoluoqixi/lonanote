import { type Href, Stack, useRouter } from "expo-router";
import { NativeList, NativeListNavigationItem, NativeListSection, isIos26Plus } from "rn-ui-kit";

import { os } from "@/api/common";
import { useUiPreferences } from "@/hooks/settings";

import { mobileSettingsSections, settingsPages } from "../settings_config";

export function MobileSettingsHome() {
  const router = useRouter();
  const { preferences } = useUiPreferences();
  const usesNativeIosHeader = os() === "ios";
  const tracksNavigationBarScrollEdge = usesNativeIosHeader && !isIos26Plus();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "设置" }} />
      <NativeList
        automaticallyAdjustsScrollIndicatorInsets={usesNativeIosHeader ? true : undefined}
        contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
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
      </NativeList>
    </>
  );
}

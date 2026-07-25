import { useRouter } from "expo-router";
import { NativeList, NativeListNavigationItem, NativeListSection, isIos26Plus } from "rn-ui-kit";

import { os } from "@/api/common";

import { settingsRouteDefinitions } from "./settings_route_registry";
import { SettingsScreenLayout } from "./settings_screen_layout";
import { useSettingsHomeSyncState } from "./use_settings_sync_state";

export function SettingsHomeScreen() {
  const router = useRouter();
  const syncState = useSettingsHomeSyncState();
  const usesNativeIosHeader = os() === "ios";
  const usesPreIos26ScrollEdgeHeader = usesNativeIosHeader && !isIos26Plus();

  return (
    <SettingsScreenLayout error={syncState.error} isLoading={syncState.isLoading} title="设置">
      <NativeList
        automaticallyAdjustsScrollIndicatorInsets={usesNativeIosHeader ? true : undefined}
        contentInsetAdjustmentBehavior={usesPreIos26ScrollEdgeHeader ? "automatic" : undefined}
        tracksNavigationBarScrollEdge={usesPreIos26ScrollEdgeHeader}
      >
        <NativeListSection title="通用">
          {settingsRouteDefinitions.map((definition) => (
            <NativeListNavigationItem
              key={definition.key}
              onPress={() => router.push(definition.href)}
              subtitle={definition.description}
              title={definition.label}
            />
          ))}
        </NativeListSection>
      </NativeList>
    </SettingsScreenLayout>
  );
}

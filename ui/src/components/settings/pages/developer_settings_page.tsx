import { type Href, useRouter } from "expo-router";
import {
  NativeList,
  NativeListNavigationItem,
  NativeListSection,
  NativeListSwitchItem,
} from "rn-ui-kit";

import { useUiPreferences } from "@/hooks/settings";

import type { SettingsPageProps } from "../settings_config";

function runSettingsAction(scope: string, action: Promise<unknown>) {
  void action.catch((error) => {
    console.error(`[settings] ${scope} failed`, error);
  });
}

export function DeveloperSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const router = useRouter();
  const { preferences, updateAndSave } = useUiPreferences();

  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={tracksNavigationBarScrollEdge ? true : undefined}
      contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      <NativeListSection title="设置">
        <NativeListSwitchItem
          switchProps={{
            checked: preferences.developer.optionsEnabled,
            onCheckedChange: (nextValue) => {
              runSettingsAction(
                "toggle developer options",
                updateAndSave((currentPreferences) => ({
                  ...currentPreferences,
                  developer: {
                    ...currentPreferences.developer,
                    optionsEnabled: nextValue,
                  },
                })),
              );
            },
          }}
          title="开发者选项"
        />
      </NativeListSection>

      <NativeListSection title="调试">
        <NativeListNavigationItem
          onPress={() => router.push("/debug" as Href)}
          title="UI 组件调试"
        />
      </NativeListSection>
    </NativeList>
  );
}

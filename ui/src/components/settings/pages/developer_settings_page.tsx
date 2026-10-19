import { type Href, useRouter } from "expo-router";
import { NativeListNavigationItem, NativeListSection, NativeListSwitchItem } from "rn-ui-kit";

import { isWeb } from "@/api/common/platform";
import { useUiPreferences } from "@/hooks/settings";

import type { SettingsPageProps } from "../settings_config";
import { SettingsList } from "../settings_list";
import { useSettingsPresentation } from "../use_settings_presentation";

function runSettingsAction(scope: string, action: Promise<unknown>) {
  void action.catch((error) => {
    console.error(`[settings] ${scope} failed`, error);
  });
}

export function DeveloperSettingsPage({
  onOpenDebugSheet,
  onOpenGmSheet,
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const presentation = useSettingsPresentation();
  const router = useRouter();
  const { preferences, updateAndSave } = useUiPreferences();

  return (
    <>
      <SettingsList
        style={{ flex: 1 }}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
      >
        <NativeListSection {...presentation.section} title="设置">
          <NativeListSwitchItem
            {...presentation.item}
            switchProps={{
              ...presentation.switch,
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

        <NativeListSection {...presentation.section} title="调试">
          <NativeListNavigationItem
            {...presentation.item}
            onPress={() => {
              if (isWeb() && onOpenDebugSheet != null) {
                onOpenDebugSheet();
                return;
              }

              router.push("/debug" as Href);
            }}
            title="UI 组件调试"
          />
          <NativeListNavigationItem
            {...presentation.item}
            onPress={() => {
              if (isWeb() && onOpenGmSheet != null) {
                onOpenGmSheet();
                return;
              }

              router.push("/settings/gm" as Href);
            }}
            title="GM 调试"
          />
        </NativeListSection>
      </SettingsList>
    </>
  );
}

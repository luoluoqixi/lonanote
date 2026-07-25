import { useRef } from "react";
import { NativeList, NativeListItem, NativeListSection, triggerNativeHaptics } from "rn-ui-kit";

import { getAppHomeTitle, getVersion } from "@/config";
import { useUiPreferences } from "@/hooks/settings";
import { useToast } from "@/hooks/ui";

import type { SettingsPageProps } from "../settings_config";

const DEVELOPER_OPTIONS_TAP_COUNT = 10;
const DEVELOPER_OPTIONS_ENABLED_TOAST_COOLDOWN_MS = 10_000;

export function AboutSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const versionPressCountRef = useRef(0);
  const unlockPendingRef = useRef(false);
  const enabledToastShownAtRef = useRef(0);
  const { isLoaded, preferences, updateAndSave } = useUiPreferences();
  const { toast } = useToast();

  const handleVersionPress = () => {
    if (!isLoaded || unlockPendingRef.current) {
      return;
    }

    if (preferences.developer.optionsEnabled) {
      const now = Date.now();
      if (now - enabledToastShownAtRef.current < DEVELOPER_OPTIONS_ENABLED_TOAST_COOLDOWN_MS) {
        return;
      }

      enabledToastShownAtRef.current = now;
      triggerNativeHaptics("medium");
      toast.info("开发者选项已开启");
      return;
    }

    versionPressCountRef.current += 1;
    if (versionPressCountRef.current < DEVELOPER_OPTIONS_TAP_COUNT) {
      return;
    }

    unlockPendingRef.current = true;
    void updateAndSave((currentPreferences) => ({
      ...currentPreferences,
      developer: {
        ...currentPreferences.developer,
        optionsEnabled: true,
      },
    }))
      .then(() => {
        versionPressCountRef.current = 0;
        unlockPendingRef.current = false;
        enabledToastShownAtRef.current = Date.now();
        toast.success("已开启开发者选项");
      })
      .catch((error) => {
        versionPressCountRef.current = 0;
        unlockPendingRef.current = false;
        console.error("[settings] enable developer options failed", error);
        toast.error("开发者选项开启失败");
      });
  };

  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={tracksNavigationBarScrollEdge ? true : undefined}
      contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      <NativeListSection title="应用信息">
        <NativeListItem title="名称" value={getAppHomeTitle()} />
        <NativeListItem onPress={handleVersionPress} title="版本" value={getVersion()} />
      </NativeListSection>
    </NativeList>
  );
}

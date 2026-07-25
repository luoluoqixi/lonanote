import { NativeList, NativeListItem, NativeListSection } from "rn-ui-kit";

import { getAppHomeTitle, getVersion } from "@/config";

import type { SettingsPageProps } from "../settings_config";

export function AboutSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={tracksNavigationBarScrollEdge ? true : undefined}
      contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      <NativeListSection title="应用信息">
        <NativeListItem title="名称" value={getAppHomeTitle()} />
        <NativeListItem title="版本" value={getVersion()} />
      </NativeListSection>
    </NativeList>
  );
}

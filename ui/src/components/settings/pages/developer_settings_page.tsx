import { type Href, useRouter } from "expo-router";
import { NativeList, NativeListNavigationItem, NativeListSection } from "rn-ui-kit";

import type { SettingsPageProps } from "../settings_config";

export function DeveloperSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const router = useRouter();

  return (
    <NativeList
      automaticallyAdjustsScrollIndicatorInsets={tracksNavigationBarScrollEdge ? true : undefined}
      contentInsetAdjustmentBehavior={tracksNavigationBarScrollEdge ? "automatic" : undefined}
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      <NativeListSection title="调试">
        <NativeListNavigationItem
          onPress={() => router.push("/debug" as Href)}
          title="UI 组件调试"
        />
      </NativeListSection>
    </NativeList>
  );
}

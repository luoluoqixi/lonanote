import { NativeListItem, NativeListSection } from "rn-ui-kit";

import type { SettingsPageProps } from "../settings_config";
import { SettingsList } from "../settings_list";

export function LanguageSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  return (
    <SettingsList
      style={{ flex: 1 }}
      tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
    >
      <NativeListSection footer="当前版本仅提供简体中文。" title="应用语言">
        <NativeListItem title="语言" value="简体中文" />
      </NativeListSection>
    </SettingsList>
  );
}

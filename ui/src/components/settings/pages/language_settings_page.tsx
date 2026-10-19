import { NativeListItem, NativeListSection } from "rn-ui-kit";

import type { SettingsPageProps } from "../settings_config";
import { SettingsList } from "../settings_list";
import { useSettingsPresentation } from "../use_settings_presentation";

export function LanguageSettingsPage({
  tracksNavigationBarScrollEdge = false,
}: SettingsPageProps = {}) {
  const presentation = useSettingsPresentation();
  return (
    <SettingsList style={{ flex: 1 }} tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}>
      <NativeListSection
        {...presentation.section}
        footer="当前版本仅提供简体中文。"
        title="应用语言"
      >
        <NativeListItem {...presentation.item} title="语言" value="简体中文" />
      </NativeListSection>
    </SettingsList>
  );
}

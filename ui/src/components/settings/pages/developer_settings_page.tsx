import { type Href, useRouter } from "expo-router";

import type { SettingsPageProps } from "../settings_config";
import { DeveloperSettingsContent } from "./developer_settings_content";

export function DeveloperSettingsPage(props: SettingsPageProps = {}) {
  const router = useRouter();
  return (
    <DeveloperSettingsContent
      {...props}
      onOpenDebugSheet={props.onOpenDebugSheet ?? (() => router.push("/debug" as Href))}
      onOpenGmSheet={props.onOpenGmSheet ?? (() => router.push("/settings/gm" as Href))}
    />
  );
}

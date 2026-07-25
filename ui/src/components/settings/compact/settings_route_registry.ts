import type { Href } from "expo-router";
import type { ReactNode } from "react";

import { AppearanceSettingsPanel, GlobalSettingsPanel, type SettingsPanelProps } from "../sections";

export type SettingsRouteKey = "global" | "appearance";

export type SettingsRouteDefinition = {
  Component: (props: SettingsPanelProps) => ReactNode;
  description?: string;
  href: Href;
  key: SettingsRouteKey;
  label: string;
};

export const settingsRouteDefinitions: SettingsRouteDefinition[] = [
  {
    Component: GlobalSettingsPanel,
    href: "/settings/global" as Href,
    key: "global",
    label: "全局设置",
  },
  {
    Component: AppearanceSettingsPanel,
    href: "/settings/appearance" as Href,
    key: "appearance",
    label: "外观设置",
  },
];

export function getSettingsRouteDefinition(key: SettingsRouteKey): SettingsRouteDefinition {
  const matchedDefinition = settingsRouteDefinitions.find((definition) => definition.key === key);
  if (!matchedDefinition) throw new Error(`Unknown settings route: ${key}`);
  return matchedDefinition;
}

const settingsMobileHeaderTitles: Record<string, string> = {
  "settings/index": "设置",
  ...Object.fromEntries(
    settingsRouteDefinitions.map((definition) => [
      String(definition.href).slice(1),
      definition.label,
    ]),
  ),
};

export function getSettingsMobileHeaderTitle(routeName: string): string | null {
  return settingsMobileHeaderTitles[routeName] ?? null;
}

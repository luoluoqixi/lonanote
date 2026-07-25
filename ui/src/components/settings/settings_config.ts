import type { ComponentType } from "react";

import type { AppLayoutMode } from "@/stores/ui";

import { AboutSettingsPage } from "./pages/about_settings_page";
import { AppearanceSettingsPage } from "./pages/appearance_settings_page";
import { GlobalSettingsPage } from "./pages/global_settings_page";
import { LanguageSettingsPage } from "./pages/language_settings_page";
import { WindowSettingsPage } from "./pages/window_settings_page";

export type SettingsPageId = "about" | "appearance" | "global" | "language" | "window";
export type MobileSettingsSectionId = "general" | "more";

export type SettingsPageProps = {
  onLayoutModeChange?: (layoutMode: AppLayoutMode) => void;
  tracksNavigationBarScrollEdge?: boolean;
};

export type SettingsPageConfig = {
  Component: ComponentType<SettingsPageProps>;
  desktopTab: boolean;
  id: SettingsPageId;
  mobileSection?: MobileSettingsSectionId;
  title: string;
};

export const mobileSettingsSections: Array<{
  id: MobileSettingsSectionId;
  title: string;
}> = [
  { id: "general", title: "通用" },
  { id: "more", title: "更多" },
];

export const settingsPages: SettingsPageConfig[] = [
  {
    Component: GlobalSettingsPage,
    desktopTab: true,
    id: "global",
    mobileSection: "general",
    title: "全局设置",
  },
  {
    Component: AppearanceSettingsPage,
    desktopTab: true,
    id: "appearance",
    mobileSection: "general",
    title: "外观设置",
  },
  {
    Component: WindowSettingsPage,
    desktopTab: true,
    id: "window",
    title: "窗口",
  },
  {
    Component: LanguageSettingsPage,
    desktopTab: true,
    id: "language",
    mobileSection: "more",
    title: "语言",
  },
  {
    Component: AboutSettingsPage,
    desktopTab: true,
    id: "about",
    mobileSection: "more",
    title: "关于",
  },
];

export function getSettingsPage(pageId: string | undefined): SettingsPageConfig | null {
  return settingsPages.find((page) => page.id === pageId) ?? null;
}

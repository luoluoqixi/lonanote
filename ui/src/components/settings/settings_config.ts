import type { ComponentType } from "react";

import type { AppLayoutMode } from "@/stores/ui";

import { AboutSettingsPage } from "./pages/about_settings_page";
import { AppearanceSettingsPage } from "./pages/appearance_settings_page";
import { CurrentWorkspaceSettingsPage } from "./pages/current_workspace_settings_page";
import { DeveloperSettingsPage } from "./pages/developer_settings_page";
import { GlobalSettingsPage } from "./pages/global_settings_page";
import { GmSettingsPage } from "./pages/gm_settings_page";
import { LanguageSettingsPage } from "./pages/language_settings_page";
import { LicensesSettingsPage } from "./pages/licenses_settings_page";
import { WindowSettingsPage } from "./pages/window_settings_page";

export type SettingsPageId =
  | "about"
  | "appearance"
  | "developer"
  | "gm"
  | "global"
  | "language"
  | "licenses"
  | "window"
  | "workspace";
export type MobileSettingsSectionId = "general" | "workspace" | "more";

export type SettingsPageProps = {
  onNavigate?: (pageId: SettingsPageId, params?: Record<string, string>) => void;
  onBack?: () => void;
  pageParams?: Record<string, string>;
  /** 由桌面设置容器提供，用于在 Dialog 外层打开调试 Sheet。 */
  onOpenDebugSheet?: () => void;
  /** 由桌面设置容器提供，用于在 Dialog 外层打开 GM 调试 Sheet。 */
  onOpenGmSheet?: () => void;
  onLayoutModeChange?: (layoutMode: AppLayoutMode) => void;
  tracksNavigationBarScrollEdge?: boolean;
};

export type SettingsPageConfig = {
  Component: ComponentType<SettingsPageProps>;
  desktopTab: boolean;
  id: SettingsPageId;
  mobileSection?: MobileSettingsSectionId;
  parentId?: SettingsPageId;
  requiresDeveloperOptions?: boolean;
  requiresWorkspace?: boolean;
  title: string;
};

export const mobileSettingsSections: Array<{
  id: MobileSettingsSectionId;
  title: string;
}> = [
  { id: "general", title: "通用" },
  { id: "workspace", title: "工作区" },
  { id: "more", title: "更多" },
];

export const settingsPages: SettingsPageConfig[] = [
  {
    Component: LicensesSettingsPage,
    desktopTab: false,
    id: "licenses",
    parentId: "about",
    title: "开源许可",
  },
  {
    Component: GlobalSettingsPage,
    desktopTab: true,
    id: "global",
    mobileSection: "general",
    title: "全局设置",
  },
  {
    Component: CurrentWorkspaceSettingsPage,
    desktopTab: true,
    id: "workspace",
    requiresWorkspace: true,
    title: "工作区设置",
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
    mobileSection: "general",
    title: "语言设置",
  },
  {
    Component: DeveloperSettingsPage,
    desktopTab: true,
    id: "developer",
    mobileSection: "more",
    requiresDeveloperOptions: true,
    title: "开发者选项",
  },
  {
    Component: GmSettingsPage,
    desktopTab: false,
    id: "gm",
    parentId: "developer",
    requiresDeveloperOptions: true,
    title: "GM",
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

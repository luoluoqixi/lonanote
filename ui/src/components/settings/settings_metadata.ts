import type { AppLayoutMode } from "@/stores/ui";

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

export const settingsPageMetadata: SettingsPageConfig[] = [
  {
    desktopTab: false,
    id: "licenses",
    parentId: "about",
    title: "开源许可",
  },
  {
    desktopTab: true,
    id: "global",
    mobileSection: "general",
    title: "全局设置",
  },
  {
    desktopTab: true,
    id: "workspace",
    requiresWorkspace: true,
    title: "工作区设置",
  },
  {
    desktopTab: true,
    id: "appearance",
    mobileSection: "general",
    title: "外观设置",
  },
  {
    desktopTab: true,
    id: "window",
    title: "窗口",
  },
  {
    desktopTab: true,
    id: "language",
    mobileSection: "general",
    title: "语言设置",
  },
  {
    desktopTab: true,
    id: "developer",
    mobileSection: "more",
    requiresDeveloperOptions: true,
    title: "开发者选项",
  },
  {
    desktopTab: false,
    id: "gm",
    parentId: "developer",
    requiresDeveloperOptions: true,
    title: "GM",
  },
  {
    desktopTab: true,
    id: "about",
    mobileSection: "more",
    title: "关于",
  },
];

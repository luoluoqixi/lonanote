import { AboutSettingsPage } from "./pages/about_settings_page";
import { AppearanceSettingsPage } from "./pages/appearance_settings_page";
import { CurrentWorkspaceSettingsPage } from "./pages/current_workspace_settings_page";
import { DeveloperSettingsPage } from "./pages/developer_settings_page";
import { GlobalSettingsPage } from "./pages/global_settings_page";
import { GmSettingsPage } from "./pages/gm_settings_page";
import { LanguageSettingsPage } from "./pages/language_settings_page";
import { LicensesSettingsPage } from "./pages/licenses_settings_page";
import { WindowSettingsPage } from "./pages/window_settings_page";
import { settingsPageMetadata } from "./settings_metadata";

export type {
  SettingsPageId,
  SettingsPageProps,
  MobileSettingsSectionId,
} from "./settings_metadata";
export { mobileSettingsSections } from "./settings_metadata";

const components = {
  licenses: LicensesSettingsPage,
  global: GlobalSettingsPage,
  workspace: CurrentWorkspaceSettingsPage,
  appearance: AppearanceSettingsPage,
  window: WindowSettingsPage,
  language: LanguageSettingsPage,
  developer: DeveloperSettingsPage,
  gm: GmSettingsPage,
  about: AboutSettingsPage,
};

export const settingsPages = settingsPageMetadata.map((page) => ({
  ...page,
  Component: components[page.id],
}));
export function getSettingsPage(pageId: string | undefined) {
  return settingsPages.find((page) => page.id === pageId) ?? null;
}
export type SettingsPageConfig = (typeof settingsPages)[number];

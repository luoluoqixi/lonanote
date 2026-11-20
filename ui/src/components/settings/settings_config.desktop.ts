import { lazy } from "react";

import { settingsPageMetadata } from "./settings_metadata";

export type { SettingsPageId } from "./settings_metadata";
const AboutSettingsPage = lazy(() =>
  import("./pages/about_settings_page").then((m) => ({ default: m.AboutSettingsPage })),
);
const AppearanceSettingsPage = lazy(() =>
  import("./pages/appearance_settings_page").then((m) => ({ default: m.AppearanceSettingsPage })),
);
const CurrentWorkspaceSettingsPage = lazy(() =>
  import("./pages/current_workspace_settings_page").then((m) => ({
    default: m.CurrentWorkspaceSettingsPage,
  })),
);
const DeveloperSettingsPage = lazy(() =>
  import("./pages/developer_settings_content").then((m) => ({
    default: m.DeveloperSettingsContent,
  })),
);
const GlobalSettingsPage = lazy(() =>
  import("./pages/global_settings_page").then((m) => ({ default: m.GlobalSettingsPage })),
);
const GmSettingsPage = lazy(() =>
  import("./pages/gm_settings_page").then((m) => ({ default: m.GmSettingsPage })),
);
const LanguageSettingsPage = lazy(() =>
  import("./pages/language_settings_page").then((m) => ({ default: m.LanguageSettingsPage })),
);
const LicensesSettingsPage = lazy(() =>
  import("./pages/licenses_settings_page").then((m) => ({ default: m.LicensesSettingsPage })),
);
const WindowSettingsPage = lazy(() =>
  import("./pages/window_settings_page").then((m) => ({ default: m.WindowSettingsPage })),
);
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

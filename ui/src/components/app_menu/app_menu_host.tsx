import { type ReactNode, createContext, useContext } from "react";

import { DesktopSettingsDialog } from "@/components/settings/desktop/settings_dialog";
import { WorkspaceLocationSheet } from "@/components/workspaces/workspace_select/workspace_location_sheet";
import { useLayoutMode } from "@/hooks/layout";

import { NativeAppMenu } from "./native_app_menu";
import { useAppMenu } from "./use_app_menu";

const AppMenuContext = createContext<ReturnType<typeof useAppMenu> | null>(null);

export function AppMenuHost({ children }: { children: ReactNode }) {
  const menu = useAppMenu();
  const { layoutMode } = useLayoutMode();
  return (
    <AppMenuContext.Provider value={menu}>
      {children}
      {menu.presentation.native ? <NativeAppMenu menu={menu} /> : null}
      {layoutMode === "desktop" ? (
        <DesktopSettingsDialog
          isOpen={menu.settings.open}
          initialPageId={menu.settings.page}
          onOpenChange={menu.setSettingsOpen}
        />
      ) : null}
      <WorkspaceLocationSheet location={menu.location} />
    </AppMenuContext.Provider>
  );
}

export function useAppMenuContext() {
  const menu = useContext(AppMenuContext);
  if (!menu) throw new Error("应用菜单需要 AppMenuHost");
  return menu;
}

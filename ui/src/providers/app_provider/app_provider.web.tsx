import { useDesktopWindowState } from "@/hooks/settings/use_desktop_window_state";
import { useEditorFontRuntime } from "@/hooks/settings/use_font_settings";

import { AppUiProvider } from "./app_ui_provider.web";
import type { AppProviderProps } from "./types";

export function AppProvider({ children }: AppProviderProps) {
  useDesktopWindowState();
  useEditorFontRuntime();
  return <AppUiProvider>{children}</AppUiProvider>;
}

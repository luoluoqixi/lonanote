import { useCallback } from "react";
import { useTheme } from "tamagui";

import {
  TrueSheetStackHost,
  trueSheetInnerStackScreenOptions,
} from "@/components/ui/true_sheet/stack";
import { DEBUG_OVERLAY_PORTAL_HOST } from "@/components/ui/utils/overlay_toast_layout";
import { useResolvedeColorScheme } from "@/hooks/settings";

import { DEBUG_TRUE_SHEET_NAME, closeDebugPanel, markDebugPanelClosed } from "./api";
import { createDebugTrueSheetStackScreens } from "./stack_routes";

/** iOS True Sheet：内嵌 Native Stack 原生标题栏。 */
export function DebugTrueSheetIosStackHost() {
  const colorScheme = useResolvedeColorScheme();
  const theme = useTheme();

  const handleRequestClose = useCallback(() => {
    void closeDebugPanel();
  }, []);

  const handleDidDismiss = useCallback(() => {
    markDebugPanelClosed();
  }, []);

  return (
    <TrueSheetStackHost
      initialRouteName="index"
      name={DEBUG_TRUE_SHEET_NAME}
      onDidDismiss={handleDidDismiss}
      onRequestClose={handleRequestClose}
      overlayPortalHostName={DEBUG_OVERLAY_PORTAL_HOST}
      screenOptions={trueSheetInnerStackScreenOptions(
        colorScheme,
        theme.background.val,
        theme.color.val,
      )}
    >
      {createDebugTrueSheetStackScreens()}
    </TrueSheetStackHost>
  );
}

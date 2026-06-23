import { useEffect, useState } from "react";

import { dismissTrueSheet, presentTrueSheet } from "./true_sheet";
import { TrueSheetStackHost } from "./true_sheet/stack_host";
import {
  TrueSheetInnerStack,
  createTrueSheetStackNavigationRef,
} from "./true_sheet/stack_navigation";
import type { NativeSheetStackProps } from "./types";

function NativeSheetStackRoot({
  children,
  initialRouteName = "index",
  name,
  onOpenChange,
  open = false,
  overlayPortalHostName,
  screenOptions,
  sheetProps,
}: NativeSheetStackProps) {
  const [sheetName] = useState(() => name ?? "native-sheet-stack");
  const [navigationRef] = useState(() => createTrueSheetStackNavigationRef());

  useEffect(() => {
    if (open) {
      presentTrueSheet(sheetName).catch(() => undefined);
      return;
    }

    dismissTrueSheet(sheetName).catch(() => undefined);
  }, [open, sheetName]);

  return (
    <TrueSheetStackHost
      initialRouteName={initialRouteName}
      name={sheetName}
      navigationRef={navigationRef}
      onDidDismiss={() => onOpenChange?.(false)}
      onRequestClose={() => onOpenChange?.(false)}
      overlayPortalHostName={overlayPortalHostName}
      screenOptions={screenOptions}
      sheetProps={sheetProps as any}
    >
      {children}
    </TrueSheetStackHost>
  );
}

export const NativeSheetStack = Object.assign(NativeSheetStackRoot, {
  Screen: TrueSheetInnerStack.Screen,
});

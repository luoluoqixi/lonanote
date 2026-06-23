import { useEffect, useRef, useState } from "react";

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
  const presentedRef = useRef(false);
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (open) {
      if (presentedRef.current || dismissingRef.current) {
        return;
      }

      dismissingRef.current = false;
      presentTrueSheet(sheetName).catch(() => undefined);
      return;
    }

    if (!presentedRef.current || dismissingRef.current) {
      return;
    }

    dismissingRef.current = true;
    dismissTrueSheet(sheetName).catch(() => undefined);
  }, [open, sheetName]);

  return (
    <TrueSheetStackHost
      initialRouteName={initialRouteName}
      name={sheetName}
      navigationRef={navigationRef}
      onDidDismiss={() => {
        presentedRef.current = false;
        dismissingRef.current = false;
        onOpenChange?.(false);
      }}
      onDidPresent={() => {
        presentedRef.current = true;
        dismissingRef.current = false;
      }}
      onRequestClose={() => {
        dismissingRef.current = true;
        onOpenChange?.(false);
      }}
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

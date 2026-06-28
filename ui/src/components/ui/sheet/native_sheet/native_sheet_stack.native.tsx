import { useEffect, useRef, useState } from "react";

import { dismissTrueSheet } from "./true_sheet";
import { TrueSheetStackHost } from "./true_sheet/stack_host";
import {
  TrueSheetInnerStack,
  createTrueSheetStackNavigationRef,
} from "./true_sheet/stack_navigation";
import type { NativeSheetStackProps } from "./types";

function TrueSheetNativeSheetStackRoot({
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
  const [mounted, setMounted] = useState(open);
  const presentedRef = useRef(false);
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (open) {
      if (mounted || dismissingRef.current) {
        return;
      }

      dismissingRef.current = false;
      setMounted(true);
      return;
    }

    if (!presentedRef.current || dismissingRef.current) {
      if (mounted && !presentedRef.current) {
        setMounted(false);
      }
      return;
    }

    dismissingRef.current = true;
    dismissTrueSheet(sheetName).catch(() => undefined);
  }, [mounted, open, sheetName]);

  if (!mounted) {
    return null;
  }

  return (
    <TrueSheetStackHost
      initialRouteName={initialRouteName}
      name={sheetName}
      navigationRef={navigationRef}
      onDidDismiss={() => {
        presentedRef.current = false;
        dismissingRef.current = false;
        setMounted(false);
        onOpenChange?.(false);
      }}
      onDidPresent={() => {
        presentedRef.current = true;
        dismissingRef.current = false;
      }}
      onRequestClose={() => {
        onOpenChange?.(false);
      }}
      overlayPortalHostName={overlayPortalHostName}
      screenOptions={screenOptions}
      sheetProps={{ initialDetentIndex: 0, ...sheetProps } as any}
    >
      {children}
    </TrueSheetStackHost>
  );
}

export const NativeSheetStack = Object.assign(TrueSheetNativeSheetStackRoot, {
  Screen: TrueSheetInnerStack.Screen,
});

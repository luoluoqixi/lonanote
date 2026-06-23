import { useEffect, useMemo, useState } from "react";

import { NativeSheet } from "./native_sheet";
import { TrueSheetStackHostProvider } from "./true_sheet/stack_context";
import { TrueSheetStackHeaderCloseButton } from "./true_sheet/stack_header";
import {
  TrueSheetInnerStack,
  TrueSheetStackNavigation,
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
  const [navigationRef] = useState(() => createTrueSheetStackNavigationRef());
  const mergedScreenOptions = useMemo(
    () => ({
      headerBackTitle: "返回",
      headerRight: () => <TrueSheetStackHeaderCloseButton title="关闭" />,
      headerShown: true,
      ...screenOptions,
    }),
    [screenOptions],
  );

  useEffect(() => {
    if (open || !navigationRef.isReady()) {
      return;
    }

    navigationRef.reset({
      index: 0,
      routes: [{ name: initialRouteName }],
    });
  }, [initialRouteName, navigationRef, open]);

  return (
    <NativeSheet
      handle={sheetProps?.grabber}
      name={name}
      onOpenChange={onOpenChange}
      open={open}
      overlayPortalHostName={overlayPortalHostName}
      position={0}
      snapPoints={sheetProps?.snapPoints}
      snapPointsMode={sheetProps?.snapPointsMode}
    >
      <TrueSheetStackHostProvider onRequestClose={() => onOpenChange?.(false)}>
        <TrueSheetStackNavigation
          initialRouteName={initialRouteName}
          navigationRef={navigationRef}
          screenOptions={mergedScreenOptions}
        >
          {children}
        </TrueSheetStackNavigation>
      </TrueSheetStackHostProvider>
    </NativeSheet>
  );
}

export const NativeSheetStack = Object.assign(NativeSheetStackRoot, {
  Screen: TrueSheetInnerStack.Screen,
});

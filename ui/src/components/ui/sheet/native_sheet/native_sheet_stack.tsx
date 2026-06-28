import { useEffect, useMemo, useState } from "react";

import { BottomSheetStackHostProvider } from "./bottom_sheet/stack_context";
import { BottomSheetStackHeaderCloseButton } from "./bottom_sheet/stack_header";
import {
  BottomSheetInnerStack,
  BottomSheetStackNavigation,
  createBottomSheetStackNavigationRef,
} from "./bottom_sheet/stack_navigation";
import { NativeSheet } from "./native_sheet";
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
  const [navigationRef] = useState(() => createBottomSheetStackNavigationRef());
  const mergedScreenOptions = useMemo(
    () => ({
      headerBackTitle: "返回",
      headerRight: () => <BottomSheetStackHeaderCloseButton title="关闭" />,
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
      <BottomSheetStackHostProvider onRequestClose={() => onOpenChange?.(false)}>
        <BottomSheetStackNavigation
          initialRouteName={initialRouteName}
          navigationRef={navigationRef}
          screenOptions={mergedScreenOptions as never}
        >
          {children}
        </BottomSheetStackNavigation>
      </BottomSheetStackHostProvider>
    </NativeSheet>
  );
}

export const NativeSheetStack = Object.assign(NativeSheetStackRoot, {
  Screen: BottomSheetInnerStack.Screen,
});

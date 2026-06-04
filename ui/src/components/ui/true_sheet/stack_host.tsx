import { TrueSheet } from "@lodev09/react-native-true-sheet";
import type { TrueSheetProps } from "@lodev09/react-native-true-sheet";
import type { ParamListBase } from "expo-router/react-navigation";
import { type ReactNode, useCallback } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ScreenOverlayPortalProvider } from "@/components/ui/utils/screen_overlay_portal";

import { TrueSheetOverlayLayoutProvider } from "./overlay_layout_context";
import {
  getTrueSheetGestureRootStyle,
  getTrueSheetStackHostScrollableProps,
} from "./platform_sheet_defaults";
import { TrueSheetStackHostProvider } from "./stack_context";
import { TrueSheetStackHeaderCloseButton } from "./stack_header";
import {
  TrueSheetStackNavigation,
  type TrueSheetStackNavigationRef,
  createTrueSheetStackNavigationRef,
} from "./stack_navigation";
import type { TrueSheetInnerStackScreenOptions } from "./stack_navigator";
import { TrueSheetScrollLayoutProvider } from "./true_sheet_scroll_context";
import { useTrueSheetOverlayLayoutSync } from "./use_true_sheet_overlay_layout_sync";

export type TrueSheetStackHostProps<ParamList extends ParamListBase = ParamListBase> = {
  children: ReactNode;
  /** 全屏 overlay portal host；不传则不包裹 Provider */
  overlayPortalHostName?: string;
  /** 关闭 Sheet 时重置栈到该路由名 */
  initialRouteName?: keyof ParamList & string;
  name: string;
  navigationRef?: TrueSheetStackNavigationRef<ParamList>;
  onDidDismiss?: () => void;
  onRequestClose?: () => void;
  screenOptions?: TrueSheetInnerStackScreenOptions;
  /** 透传 TrueSheet 属性（不含 name / children / header） */
  sheetProps?: Omit<TrueSheetProps, "children" | "header" | "name">;
};

const defaultSheetProps: Pick<
  TrueSheetProps,
  "detents" | "dismissible" | "grabber" | "insetAdjustment" | "pageSizing"
> &
  Pick<TrueSheetProps, "scrollable" | "scrollableOptions"> = {
  detents: [1],
  dismissible: true,
  grabber: false,
  insetAdjustment: "automatic" as const,
  pageSizing: true,
  ...getTrueSheetStackHostScrollableProps(),
};

/**
 * 具名 True Sheet + 内嵌原生 Stack（替代自绘 header + useState 切屏）。
 */
function TrueSheetStackHostInner<ParamList extends ParamListBase = ParamListBase>({
  children,
  initialRouteName = "index",
  name,
  navigationRef: navigationRefProp,
  onDidDismiss,
  onRequestClose,
  overlayPortalHostName,
  screenOptions,
  sheetProps,
}: TrueSheetStackHostProps<ParamList>) {
  const navigationRef = navigationRefProp ?? createTrueSheetStackNavigationRef<ParamList>();
  const overlayLayoutSync = useTrueSheetOverlayLayoutSync(sheetProps);

  const handleRequestClose = useCallback(() => {
    onRequestClose?.();
  }, [onRequestClose]);

  const handleDidDismiss = useCallback<NonNullable<TrueSheetProps["onDidDismiss"]>>(
    (event) => {
      if (navigationRef.isReady()) {
        navigationRef.reset({
          index: 0,
          routes: [{ name: initialRouteName as string }],
        });
      }

      onDidDismiss?.();
      overlayLayoutSync.onDidDismiss(event);
    },
    [initialRouteName, navigationRef, onDidDismiss, overlayLayoutSync],
  );

  const mergedScreenOptions: TrueSheetInnerStackScreenOptions = {
    headerBackTitle: "返回",
    headerRight: () => <TrueSheetStackHeaderCloseButton />,
    headerShown: true,
    ...screenOptions,
  };

  const insetAdjustment = sheetProps?.insetAdjustment ?? defaultSheetProps.insetAdjustment;

  const stackNavigation = (
    <TrueSheetStackHostProvider onRequestClose={handleRequestClose}>
      <TrueSheetStackNavigation
        initialRouteName={initialRouteName as string}
        navigationRef={navigationRef}
        screenOptions={mergedScreenOptions}
      >
        {children}
      </TrueSheetStackNavigation>
    </TrueSheetStackHostProvider>
  );

  const sheetBody = (
    <TrueSheetScrollLayoutProvider
      insetAdjustment={insetAdjustment}
      nativeScrollInsetsApplied={false}
    >
      <GestureHandlerRootView style={styles.gestureRoot}>
        {overlayPortalHostName != null ? (
          <ScreenOverlayPortalProvider hostName={overlayPortalHostName}>
            {stackNavigation}
          </ScreenOverlayPortalProvider>
        ) : (
          stackNavigation
        )}
      </GestureHandlerRootView>
    </TrueSheetScrollLayoutProvider>
  );

  return (
    <TrueSheet
      name={name}
      {...defaultSheetProps}
      {...sheetProps}
      onDetentChange={overlayLayoutSync.onDetentChange}
      onDidDismiss={handleDidDismiss}
      onDidPresent={overlayLayoutSync.onDidPresent}
      onDragChange={overlayLayoutSync.onDragChange}
      onDragEnd={overlayLayoutSync.onDragEnd}
      onPositionChange={overlayLayoutSync.onPositionChange}
      onWillPresent={overlayLayoutSync.onWillPresent}
    >
      {sheetBody}
    </TrueSheet>
  );
}

export function TrueSheetStackHost<ParamList extends ParamListBase = ParamListBase>(
  props: TrueSheetStackHostProps<ParamList>,
) {
  if (props.overlayPortalHostName == null) {
    return <TrueSheetStackHostInner {...props} />;
  }

  return (
    <TrueSheetOverlayLayoutProvider>
      <TrueSheetStackHostInner {...props} />
    </TrueSheetOverlayLayoutProvider>
  );
}

const styles = StyleSheet.create({
  gestureRoot: getTrueSheetGestureRootStyle(),
});

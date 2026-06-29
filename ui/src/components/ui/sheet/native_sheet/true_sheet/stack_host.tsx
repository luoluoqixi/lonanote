import { TrueSheet } from "@lodev09/react-native-true-sheet";
import type { TrueSheetProps } from "@lodev09/react-native-true-sheet";
import type { ParamListBase } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { BackHandler, Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { os } from "@/api/common/platform";
import { withNativeBackButton } from "@/components/ui/utils/navigation";
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
import {
  type TrueSheetInnerStackScreenOptions,
  trueSheetUsesNativeStackNavigator,
} from "./stack_navigator";
import { TrueSheetScrollLayoutProvider } from "./true_sheet_scroll_context";
import { useTrueSheetOverlayLayoutSync } from "./use_true_sheet_overlay_layout_sync";

const platform = os();

export type TrueSheetStackHostProps<ParamList extends ParamListBase = ParamListBase> = {
  children: ReactNode;
  /** 当前 True Sheet Stack 宿主专属 overlay host；若内部会开 Dialog / Popover / Toast，务必传唯一值，勿复用外层 host。 */
  overlayPortalHostName?: string;
  /** 关闭 Sheet 时重置栈到该路由名 */
  initialRouteName?: keyof ParamList & string;
  name: string;
  navigationRef?: TrueSheetStackNavigationRef<ParamList>;
  onDidDismiss?: () => void;
  onDidPresent?: () => void;
  onRequestClose?: () => void;
  screenOptions?: TrueSheetInnerStackScreenOptions;
  /** 透传 TrueSheet 属性（不含 name / children / header） */
  sheetProps?: Omit<TrueSheetProps, "children" | "header" | "name">;
};

const defaultSheetProps: Pick<
  TrueSheetProps,
  "detents" | "dismissible" | "disableStackingTranslation" | "grabber" | "insetAdjustment"
> &
  Pick<TrueSheetProps, "scrollable" | "scrollableOptions"> = {
  detents: [1],
  dismissible: true,
  disableStackingTranslation: platform === "android",
  grabber: false,
  insetAdjustment: "automatic" as const,
  ...getTrueSheetStackHostScrollableProps(),
};

/**
 * 具名 True Sheet + 内嵌原生 Stack（替代自绘 header + useState 切屏）。
 * 若 stack 内页面会再打开 Dialog / AlertDialog / Popover / Toast，需为当前宿主注册独立 `overlayPortalHostName`，
 * 避免 portal / floating 继续落到外层 sheet 或 app root 坐标系。
 */
function TrueSheetStackHostInner<ParamList extends ParamListBase = ParamListBase>({
  children,
  initialRouteName = "index",
  name,
  navigationRef: navigationRefProp,
  onDidDismiss,
  onDidPresent,
  onRequestClose,
  overlayPortalHostName,
  screenOptions,
  sheetProps,
}: TrueSheetStackHostProps<ParamList>) {
  const navigationRef = navigationRefProp ?? createTrueSheetStackNavigationRef<ParamList>();
  const overlayLayoutSync = useTrueSheetOverlayLayoutSync(sheetProps);
  const customSheetBackHandler = sheetProps?.onBackPress;
  const [presented, setPresented] = useState(false);

  const handleRequestClose = useCallback(() => {
    onRequestClose?.();
  }, [onRequestClose]);

  const handleAndroidBackPress = useCallback(() => {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
      return true;
    }

    const customHandled = customSheetBackHandler?.();
    if (customHandled !== undefined) {
      return customHandled;
    }

    handleRequestClose();
    return true;
  }, [customSheetBackHandler, handleRequestClose, navigationRef]);

  useEffect(() => {
    if (platform !== "android" || !presented) {
      return;
    }

    // TrueSheet 自身的 Android BackHandler 会先调用原生 dismiss，再触发 onBackPress。
    // 这里在 onDidPresent 后注册，利用 RN 后注册先执行的顺序，先处理内嵌 Stack 返回。
    const subscription = BackHandler.addEventListener("hardwareBackPress", handleAndroidBackPress);

    return () => subscription.remove();
  }, [handleAndroidBackPress, presented]);

  const handleDidDismiss = useCallback<NonNullable<TrueSheetProps["onDidDismiss"]>>(
    (event) => {
      setPresented(false);

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

  const handleDidPresent = useCallback<NonNullable<TrueSheetProps["onDidPresent"]>>(
    (event) => {
      setPresented(true);
      onDidPresent?.();
      overlayLayoutSync.onDidPresent(event);
    },
    [onDidPresent, overlayLayoutSync],
  );

  const mergedScreenOptions: TrueSheetInnerStackScreenOptions = {
    headerBackTitle: "返回",
    headerRight:
      platform === "ios" ? () => <TrueSheetStackHeaderCloseButton title="关闭" /> : undefined,
    headerShown: true,
    ...screenOptions,
  };

  const resolvedScreenOptions: TrueSheetInnerStackScreenOptions = trueSheetUsesNativeStackNavigator
    ? withNativeBackButton(mergedScreenOptions as NativeStackNavigationOptions, {
        label: "返回",
        onPress: () => {
          if (navigationRef.isReady() && navigationRef.canGoBack()) {
            navigationRef.goBack();
          }
        },
      })
    : mergedScreenOptions;

  const insetAdjustment = sheetProps?.insetAdjustment ?? defaultSheetProps.insetAdjustment;

  const stackNavigation = (
    <TrueSheetStackHostProvider onRequestClose={handleRequestClose}>
      <TrueSheetStackNavigation
        initialRouteName={initialRouteName as string}
        navigationRef={navigationRef}
        screenOptions={resolvedScreenOptions}
      >
        {children}
      </TrueSheetStackNavigation>
    </TrueSheetStackHostProvider>
  );

  const sheetBody = (
    <TrueSheetScrollLayoutProvider
      automaticContentInsetAdjustment={Platform.OS === "ios"}
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
      onBackPress={customSheetBackHandler}
      onDetentChange={overlayLayoutSync.onDetentChange}
      onDidDismiss={handleDidDismiss}
      onDidPresent={handleDidPresent}
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

import { TrueSheet } from "@lodev09/react-native-true-sheet";
import type { TrueSheetProps } from "@lodev09/react-native-true-sheet";
import type { ReactElement, ReactNode } from "react";
import { useCallback, useState } from "react";
import { Platform, StyleSheet, type ViewStyle } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ScreenOverlayPortalProvider } from "@/components/ui/utils/screen_overlay_portal";

import { TrueSheetOverlayLayoutProvider } from "./overlay_layout_context";
import {
  getTrueSheetGestureRootStyle,
  getTrueSheetPanelOverlayLayout,
  getTrueSheetPanelScrollableProps,
  mergeTrueSheetContentStyle,
  shouldUseTrueSheetNativeScrollInsets,
} from "./platform_sheet_defaults";
import { type TrueSheetChromeMode, resolveTrueSheetGrabber } from "./sheet_chrome";
import { TrueSheetToolbarHeader } from "./toolbar_header";
import { TrueSheetScrollLayoutProvider } from "./true_sheet_scroll_context";
import { useAndroidSheetBackHandler } from "./use_android_sheet_back_handler";
import { useTrueSheetOverlayLayoutSync } from "./use_true_sheet_overlay_layout_sync";

const DEFAULT_NATIVE_GRABBER_TOP_MARGIN = 5;

export type TrueSheetPanelProps = {
  backgroundColor?: ViewStyle["backgroundColor"];
  children: ReactNode;
  /** `plain`：仅 grabber，无顶栏；`toolbar`：自绘工具栏，无 grabber。 */
  chrome?: TrueSheetChromeMode;
  /** 原生 grabber 需要避让时，为内容区额外预留顶部占位；默认不预留，让拖拽条悬浮覆盖在内容顶部。 */
  grabberContentInsetTop?: number;
  /** 覆盖 `chrome` 默认的 grabber 行为。 */
  grabber?: boolean;
  /** 自绘 toolbar 是否透明。 */
  headerTransparent?: boolean;
  /** 自定义 header 内容，会渲染在 TrueSheet 原生 header 槽中。设置此项后 `chrome`/`title`/`canGoBack`/`headerRight` 等仍独立生效，此 header 将优先渲染。 */
  header?: ReactElement;
  name: string;
  title?: string;
  canGoBack?: boolean;
  onBack?: () => void;
  onRequestClose?: () => void;
  headerRight?: ReactNode;
  /** 当前 True Sheet 专属 overlay host 名；若 sheet 内可能打开 Dialog / Popover / Toast，务必传唯一值，勿复用外层 host。 */
  overlayPortalHostName?: string;
  onDidDismiss?: () => void;
  sheetProps?: Omit<TrueSheetProps, "children" | "header" | "name">;
};

const defaultSheetProps: Pick<TrueSheetProps, "detents" | "dismissible" | "insetAdjustment"> &
  Pick<TrueSheetProps, "scrollable" | "scrollableOptions"> = {
  detents: [1],
  dismissible: true,
  insetAdjustment: "automatic",
  ...getTrueSheetPanelScrollableProps(),
};

function TrueSheetPanelInner({
  backgroundColor,
  children,
  chrome = "plain",
  grabberContentInsetTop,
  grabber: grabberProp,
  headerTransparent = false,
  header: headerProp,
  name,
  title,
  canGoBack = false,
  onBack,
  onRequestClose,
  headerRight,
  overlayPortalHostName,
  onDidDismiss,
  sheetProps,
}: TrueSheetPanelProps) {
  const overlayLayoutSync = useTrueSheetOverlayLayoutSync(sheetProps);
  const [presented, setPresented] = useState(false);
  const showToolbar = chrome === "toolbar" && title != null;
  const grabber = resolveTrueSheetGrabber(chrome, grabberProp);

  const handleClose = useCallback(() => {
    onRequestClose?.();
  }, [onRequestClose]);

  useAndroidSheetBackHandler({
    enabled: presented && showToolbar,
    canGoBack,
    onBack: onBack ?? (() => {}),
    onClose: handleClose,
  });

  const handleDidPresent = useCallback<NonNullable<TrueSheetProps["onDidPresent"]>>(
    (event) => {
      setPresented(true);
      overlayLayoutSync.onDidPresent(event);
    },
    [overlayLayoutSync],
  );

  const handleDidDismiss = useCallback<NonNullable<TrueSheetProps["onDidDismiss"]>>(
    (event) => {
      setPresented(false);
      onDidDismiss?.();
      overlayLayoutSync.onDidDismiss(event);
    },
    [onDidDismiss, overlayLayoutSync],
  );

  const toolbarHeader =
    showToolbar && title != null ? (
      <TrueSheetToolbarHeader
        canGoBack={canGoBack}
        headerRight={headerRight}
        onBack={onBack}
        title={title}
        transparent={headerTransparent}
      />
    ) : undefined;
  const resolvedHeader = headerProp ?? toolbarHeader;
  const resolvedGrabberContentInsetTop = grabberContentInsetTop ?? 0;
  const shouldReserveGrabberContentInset =
    grabber && resolvedHeader == null && resolvedGrabberContentInsetTop > 0;
  const resolvedGrabberOptions =
    grabber && resolvedHeader == null
      ? {
          // 传任意非默认 grabberOptions 才会走 TrueSheet 的自绘 native grabber 分支，
          // 这样我们补在原生层的整行透明拖拽热区才会真正生效。
          topMargin: DEFAULT_NATIVE_GRABBER_TOP_MARGIN,
          ...sheetProps?.grabberOptions,
        }
      : sheetProps?.grabberOptions;

  const insetAdjustment = sheetProps?.insetAdjustment ?? defaultSheetProps.insetAdjustment;
  const sheetScrollable = sheetProps?.scrollable ?? defaultSheetProps.scrollable;
  const backgroundStyle = backgroundColor != null ? { backgroundColor } : null;

  const overlayBody =
    overlayPortalHostName != null ? (
      <ScreenOverlayPortalProvider
        hostName={overlayPortalHostName}
        overlayLayout={getTrueSheetPanelOverlayLayout()}
      >
        {children}
      </ScreenOverlayPortalProvider>
    ) : (
      children
    );

  const sheetBody = (
    <TrueSheetScrollLayoutProvider
      insetAdjustment={insetAdjustment}
      nativeScrollInsetsApplied={shouldUseTrueSheetNativeScrollInsets(sheetScrollable)}
    >
      <GestureHandlerRootView
        style={[
          styles.gestureRoot,
          backgroundStyle,
          shouldReserveGrabberContentInset && {
            paddingTop: resolvedGrabberContentInsetTop,
          },
          overlayPortalHostName != null && Platform.OS === "ios" && styles.gestureRootScrollSibling,
        ]}
      >
        {overlayBody}
      </GestureHandlerRootView>
    </TrueSheetScrollLayoutProvider>
  );

  const mergedScrollable = sheetScrollable;

  return (
    <TrueSheet
      header={resolvedHeader}
      name={name}
      {...defaultSheetProps}
      {...sheetProps}
      grabber={grabber}
      grabberOptions={resolvedGrabberOptions}
      onDetentChange={overlayLayoutSync.onDetentChange}
      onDidDismiss={handleDidDismiss}
      onDidPresent={handleDidPresent}
      onDragChange={overlayLayoutSync.onDragChange}
      onDragEnd={overlayLayoutSync.onDragEnd}
      onPositionChange={overlayLayoutSync.onPositionChange}
      onWillPresent={overlayLayoutSync.onWillPresent}
      style={mergeTrueSheetContentStyle(mergedScrollable, [sheetProps?.style, backgroundStyle])}
    >
      {sheetBody}
    </TrueSheet>
  );
}

/**
 * 简单 True Sheet：无内嵌 Stack。
 * - `chrome="plain"`：适合仅需 grabber 的轻量弹层。
 * - `chrome="toolbar"`：Android 等无法挂 Native Stack 时的标题栏 + 硬件返回。
 * - 若当前 sheet 内会再打开 Dialog / AlertDialog / Popover / Toast，必须为该宿主传入独立 `overlayPortalHostName`，
 *   让 portal / floating 落在当前 sheet 坐标系；不要复用外层 host。
 */
export function TrueSheetPanel(props: TrueSheetPanelProps) {
  if (props.overlayPortalHostName == null) {
    return <TrueSheetPanelInner {...props} />;
  }

  return (
    <TrueSheetOverlayLayoutProvider>
      <TrueSheetPanelInner {...props} />
    </TrueSheetOverlayLayoutProvider>
  );
}

const styles = StyleSheet.create({
  gestureRoot: getTrueSheetGestureRootStyle(),
  gestureRootScrollSibling: {
    position: "relative",
  },
});

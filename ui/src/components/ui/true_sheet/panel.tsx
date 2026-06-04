import { TrueSheet } from "@lodev09/react-native-true-sheet";
import type { TrueSheetProps } from "@lodev09/react-native-true-sheet";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ScreenOverlayPortalProvider } from "@/components/ui/utils/screen_overlay_portal";

import { type TrueSheetChromeMode, resolveTrueSheetGrabber } from "./sheet_chrome";
import { TrueSheetToolbarHeader } from "./toolbar_header";
import { useAndroidSheetBackHandler } from "./use_android_sheet_back_handler";

export type TrueSheetPanelProps = {
  children: ReactNode;
  /** `plain`：仅 grabber，无顶栏；`toolbar`：自绘工具栏，无 grabber。 */
  chrome?: TrueSheetChromeMode;
  /** 覆盖 `chrome` 默认的 grabber 行为。 */
  grabber?: boolean;
  name: string;
  title?: string;
  canGoBack?: boolean;
  onBack?: () => void;
  onRequestClose?: () => void;
  headerRight?: ReactNode;
  overlayPortalHostName?: string;
  onDidDismiss?: () => void;
  sheetProps?: Omit<TrueSheetProps, "children" | "header" | "name">;
};

const defaultSheetProps: Pick<
  TrueSheetProps,
  "detents" | "dismissible" | "insetAdjustment" | "pageSizing" | "scrollable" | "scrollableOptions"
> = {
  detents: [1],
  dismissible: true,
  insetAdjustment: "automatic",
  pageSizing: true,
  scrollable: true,
  scrollableOptions: {
    scrollingExpandsSheet: false,
  },
};

/**
 * 简单 True Sheet：无内嵌 Stack。
 * - `chrome="plain"`：适合仅需 grabber 的轻量弹层。
 * - `chrome="toolbar"`：Android 等无法挂 Native Stack 时的标题栏 + 硬件返回。
 */
export function TrueSheetPanel({
  children,
  chrome = "plain",
  grabber: grabberProp,
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
      sheetProps?.onDidPresent?.(event);
    },
    [sheetProps],
  );

  const handleDidDismiss = useCallback<NonNullable<TrueSheetProps["onDidDismiss"]>>(
    (event) => {
      setPresented(false);
      onDidDismiss?.();
      sheetProps?.onDidDismiss?.(event);
    },
    [onDidDismiss, sheetProps],
  );

  const toolbarHeader =
    showToolbar && title != null ? (
      <TrueSheetToolbarHeader
        canGoBack={canGoBack}
        headerRight={headerRight}
        onBack={onBack}
        title={title}
      />
    ) : undefined;

  const sheetBody = (
    <GestureHandlerRootView style={styles.gestureRoot}>{children}</GestureHandlerRootView>
  );

  return (
    <TrueSheet
      grabber={grabber}
      header={toolbarHeader}
      name={name}
      onDidDismiss={handleDidDismiss}
      onDidPresent={handleDidPresent}
      {...defaultSheetProps}
      {...sheetProps}
    >
      {overlayPortalHostName != null ? (
        <ScreenOverlayPortalProvider hostName={overlayPortalHostName}>
          {sheetBody}
        </ScreenOverlayPortalProvider>
      ) : (
        sheetBody
      )}
    </TrueSheet>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flexGrow: 1,
  },
});

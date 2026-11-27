import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { View, useWindowDimensions } from "react-native";
import {
  Dialog,
  NativeSheetStack,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import { dialogWindows } from "@/api/commands/win/dialog_windows";
import {
  claimNativeDialogWindowLaunch,
  releaseNativeDialogWindowLaunch,
  subscribeNativeDialogWindowLaunch,
} from "@/api/common/dialogs/dialog_launch_guard";
import { isDialogWindowRendererFailure } from "@/api/common/dialogs/dialog_types";
import type { DialogId, DialogPayloadMap } from "@/api/common/dialogs/dialog_types";
import { shouldUseNativeDialogWindow } from "@/api/common/dialogs/dialog_window_policy";
import { isDesktop, isTauri } from "@/api/common/platform";
import { useLayoutMode } from "@/hooks/layout";
import { useUiPreferences } from "@/hooks/settings";
import { useDialogPresentationParent } from "@/hooks/ui/use_dialog_presentation_parent";

type SheetStackProps = ComponentProps<typeof NativeSheetStack>;
type NativeDialogConfig = {
  [TDialogId in DialogId]: {
    id: TDialogId;
    payload: DialogPayloadMap[TDialogId];
  } & {
    title?: string;
    width?: number;
    height?: number;
    blockParentInput?: boolean;
    /** 同一个入口替换业务请求时，撤销旧窗口并创建新窗口。 */
    requestKey?: string | number;
  };
}[DialogId];
export type AdaptiveModalNativeDialog = NativeDialogConfig;

export type AdaptiveModalProps = {
  children: ReactNode;
  dialogContentProps?: ComponentProps<typeof Dialog>["contentProps"];
  dialogSize?: { width: number; height: number };
  name: string;
  nativeDialog?: NativeDialogConfig;
  /** 跨窗口交互的业务控制器留在所属工作台执行。 */
  nativeController?: (requestId: string) => ReactNode;
  onNativeResult?: (result: unknown) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  screenName?: string;
  /** 传入时替换默认的 Sheet 导航栏配置。 */
  screenOptions?: SheetStackProps["screenOptions"];
  sheetProps?: SheetStackProps["sheetProps"];
  title?: string;
};

/** 根据应用布局模式展示单页弹层：桌面使用 Dialog，移动布局使用 NativeSheetStack。 */
export function AdaptiveModal({
  children,
  dialogContentProps,
  dialogSize = { width: 520, height: 320 },
  name,
  nativeDialog,
  nativeController,
  onNativeResult,
  onOpenChange,
  open,
  screenName = "index",
  screenOptions,
  sheetProps,
  title,
}: AdaptiveModalProps) {
  const { layoutMode } = useLayoutMode();
  const { width, height } = useWindowDimensions();
  const appBackgroundColors = useAppBackgroundColors();
  const { preferences } = useUiPreferences();
  const parentRequestId = useDialogPresentationParent();
  const [nativeWindowFailed, setNativeWindowFailed] = useState(false);
  const [nativeRequestId, setNativeRequestId] = useState<string | null>(null);
  const [nativeRetry, setNativeRetry] = useState(0);
  const nativeSession = useRef<{
    requestId: string;
    launchKey: string;
    abort: AbortController;
  } | null>(null);
  const mounted = useRef(false);
  const launchKey = JSON.stringify([name, nativeDialog?.requestKey ?? null]);
  const launchKeyRef = useRef(launchKey);
  launchKeyRef.current = launchKey;
  const openRef = useRef(open);
  openRef.current = open;
  const onOpenChangeRef = useRef(onOpenChange);
  const onNativeResultRef = useRef(onNativeResult);
  const nativeDialogRef = useRef(nativeDialog);
  onOpenChangeRef.current = onOpenChange;
  onNativeResultRef.current = onNativeResult;
  nativeDialogRef.current = nativeDialog;
  const isDialogWindow =
    isDesktop() && isTauri() && getCurrentWebviewWindow().label.startsWith("dialog-window-");
  const useNativeWindow = shouldUseNativeDialogWindow({
    desktop: isDesktop(),
    tauri: isTauri(),
    layoutMode,
    nativeDialogs: preferences.window.nativeDialogs,
    dialogRegistered: Boolean(nativeDialog),
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // StrictMode 会立即重放同一实例的 effect；只在真正卸载后撤销原生请求。
      queueMicrotask(() => {
        if (mounted.current) return;
        const session = nativeSession.current;
        if (!session) return;
        nativeSession.current = null;
        session.abort.abort();
        releaseNativeDialogWindowLaunch(session.launchKey, session.requestId);
      });
    };
  }, []);

  useEffect(() => {
    const previous = nativeSession.current;
    if (previous && (!open || previous.launchKey !== launchKey)) {
      nativeSession.current = null;
      previous.abort.abort();
      releaseNativeDialogWindowLaunch(previous.launchKey, previous.requestId);
      setNativeRequestId(null);
    }
    if (!open) {
      setNativeWindowFailed(false);
      return;
    }
    if (nativeSession.current) return;
    const config = nativeDialogRef.current;
    if (!config || !useNativeWindow || nativeWindowFailed) return;
    const requestId = crypto.randomUUID();
    if (!claimNativeDialogWindowLaunch(launchKey, true, requestId)) {
      return subscribeNativeDialogWindowLaunch(launchKey, () =>
        setNativeRetry((value) => value + 1),
      );
    }
    const abort = new AbortController();
    const session = { requestId, launchKey, abort };
    nativeSession.current = session;
    setNativeRequestId(requestId);
    void dialogWindows
      .open(
        {
          requestId,
          dialogId: config.id,
          payload: config.payload,
          title: config.title ?? title ?? "",
          width: config.width ?? dialogSize.width,
          height: config.height ?? dialogSize.height,
          blockParentInput: config.blockParentInput,
          parentRequestId,
        } as never,
        { signal: abort.signal },
      )
      .then((result) => {
        if (
          !mounted.current ||
          nativeSession.current !== session ||
          launchKeyRef.current !== launchKey ||
          abort.signal.aborted ||
          !openRef.current
        )
          return;
        nativeSession.current = null;
        if (isDialogWindowRendererFailure(result)) {
          setNativeWindowFailed(true);
          return;
        }
        onNativeResultRef.current?.(result);
        onOpenChangeRef.current(false);
      })
      .catch((error) => {
        if (
          !mounted.current ||
          nativeSession.current !== session ||
          launchKeyRef.current !== launchKey ||
          abort.signal.aborted ||
          !openRef.current
        )
          return;
        nativeSession.current = null;
        console.error(`[dialog:${name}] 原生窗口创建失败，回退到应用内 Dialog`, error);
        setNativeWindowFailed(true);
      })
      .finally(() => {
        if (nativeSession.current === session) nativeSession.current = null;
        releaseNativeDialogWindowLaunch(launchKey, requestId);
        if (mounted.current)
          setNativeRequestId((current) => (current === requestId ? null : current));
      });
  }, [
    dialogSize.height,
    dialogSize.width,
    name,
    launchKey,
    nativeRetry,
    nativeWindowFailed,
    open,
    parentRequestId,
    title,
    useNativeWindow,
  ]);

  if (isDialogWindow && !nativeDialog) {
    return <View style={{ flex: 1, minHeight: 0 }}>{children}</View>;
  }
  if ((useNativeWindow && !nativeWindowFailed) || nativeRequestId) {
    return nativeRequestId ? (nativeController?.(nativeRequestId) ?? null) : null;
  }

  if (layoutMode === "desktop") {
    return (
      <Dialog
        content={children}
        onOpenChange={onOpenChange}
        open={open}
        title={title}
        contentProps={{
          ...dialogContentProps,
          herouiNativeProps: {
            ...dialogContentProps?.herouiNativeProps,
            style: [
              {
                width: Math.min(dialogSize.width, width * 0.9),
                maxWidth: width * 0.9,
                height: Math.min(dialogSize.height, height * 0.8),
                padding: 16,
                backgroundColor: appBackgroundColors.sheet,
              },
              dialogContentProps?.herouiNativeProps?.style,
            ],
          },
          herouiWebProps: {
            ...dialogContentProps?.herouiWebProps,
            style: {
              width: Math.min(dialogSize.width, width * 0.9),
              maxWidth: width * 0.9,
              height: Math.min(dialogSize.height, height * 0.8),
              padding: 16,
              backgroundColor: appBackgroundColors.sheet,
              ...dialogContentProps?.herouiWebProps?.style,
            },
          },
        }}
      />
    );
  }

  return (
    <NativeSheetStack
      initialRouteName={screenName}
      name={name}
      onOpenChange={onOpenChange}
      open={open}
      sheetProps={sheetProps}
      screenOptions={
        screenOptions ??
        getNativeStackScrollEdgeHeaderOptions({
          headerBackgroundColor: appBackgroundColors.header,
          screenBackgroundColor: appBackgroundColors.sheet,
        })
      }
    >
      <NativeSheetStack.Screen name={screenName} options={{ title }}>
        {() => children}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
  );
}

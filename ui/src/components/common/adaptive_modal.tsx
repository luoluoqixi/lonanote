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
import { claimNativeDialogWindowLaunch } from "@/api/common/dialogs/dialog_launch_guard";
import { isDialogWindowRendererFailure } from "@/api/common/dialogs/dialog_types";
import type { DialogId, DialogPayloadMap } from "@/api/common/dialogs/dialog_types";
import { shouldUseNativeDialogWindow } from "@/api/common/dialogs/dialog_window_policy";
import { isDesktop, isTauri } from "@/api/common/platform";
import { useLayoutMode } from "@/hooks/layout";
import { useUiPreferences } from "@/hooks/settings";

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
  };
}[DialogId];
export type AdaptiveModalNativeDialog = NativeDialogConfig;

export type AdaptiveModalProps = {
  children: ReactNode;
  dialogContentProps?: ComponentProps<typeof Dialog>["contentProps"];
  dialogSize?: { width: number; height: number };
  name: string;
  nativeDialog?: NativeDialogConfig;
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
  const [nativeWindowFailed, setNativeWindowFailed] = useState(false);
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
    if (!open) {
      claimNativeDialogWindowLaunch(name, false, false);
      setNativeWindowFailed(false);
      return;
    }
    if (!claimNativeDialogWindowLaunch(name, true, useNativeWindow && !nativeWindowFailed)) return;
    const config = nativeDialogRef.current;
    if (!config) return;
    void dialogWindows
      .open({
        requestId: crypto.randomUUID(),
        dialogId: config.id,
        payload: config.payload,
        title: config.title ?? title ?? "",
        width: config.width ?? dialogSize.width,
        height: config.height ?? dialogSize.height,
        blockParentInput: config.blockParentInput,
      } as never)
      .then((result) => {
        if (isDialogWindowRendererFailure(result)) {
          setNativeWindowFailed(true);
          return;
        }
        onNativeResultRef.current?.(result);
        onOpenChangeRef.current(false);
      })
      .catch((error) => {
        console.error(`[dialog:${name}] 原生窗口创建失败，回退到应用内 Dialog`, error);
        setNativeWindowFailed(true);
      });
  }, [dialogSize.height, dialogSize.width, name, nativeWindowFailed, open, title, useNativeWindow]);

  if (isDialogWindow && !nativeDialog) {
    return <View style={{ flex: 1, minHeight: 0 }}>{children}</View>;
  }
  if (useNativeWindow && !nativeWindowFailed) return null;

  if (layoutMode === "desktop") {
    return (
      <Dialog
        content={children}
        onOpenChange={onOpenChange}
        open={open}
        title={title}
        contentProps={{
          ...dialogContentProps,
          style: [
            {
              width: Math.min(dialogSize.width, width * 0.9),
              maxWidth: width * 0.9,
              height: Math.min(dialogSize.height, height * 0.8),
              padding: 16,
              backgroundColor: appBackgroundColors.sheet,
            },
            dialogContentProps?.style,
          ],
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

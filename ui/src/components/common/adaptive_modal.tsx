import type { ComponentProps, ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import {
  Dialog,
  NativeSheetStack,
  getNativeStackScrollEdgeHeaderOptions,
  useAppBackgroundColors,
} from "rn-ui-kit";

import { useLayoutMode } from "@/hooks/layout";

type SheetStackProps = ComponentProps<typeof NativeSheetStack>;

export type AdaptiveModalProps = {
  children: ReactNode;
  dialogContentProps?: ComponentProps<typeof Dialog>["contentProps"];
  dialogSize?: { width: number; height: number };
  name: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  screenName?: string;
  /** 传入时替换默认的 Sheet 导航栏配置。 */
  screenOptions?: SheetStackProps["screenOptions"];
  sheetProps?: SheetStackProps["sheetProps"];
  title: string;
};

/** 根据应用布局模式展示单页弹层：桌面使用 Dialog，移动布局使用 NativeSheetStack。 */
export function AdaptiveModal({
  children,
  dialogContentProps,
  dialogSize = { width: 520, height: 320 },
  name,
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

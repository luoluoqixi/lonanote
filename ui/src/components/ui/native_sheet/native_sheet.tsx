// Android / Web 通用实现（Android 用 Sheet，Web 直接显示内容）
import { useCallback, useMemo } from "react";

import { Sheet } from "../sheet";
import type { NativeSheetComponent, NativeSheetProps, NativeSheetScreenProps } from "./types";

function NativeSheetScreen({ children }: NativeSheetScreenProps) {
  return <>{children}</>;
}

function NativeSheetRoot({
  children,
  open = false,
  onOpenChange,
  onDismiss,
  detents = [1],
}: NativeSheetProps) {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
      if (!nextOpen) {
        onDismiss?.();
      }
    },
    [onOpenChange, onDismiss],
  );

  const sheetSnapPoints = useMemo(() => detents.map((d) => d * 100), [detents]);

  return (
    <Sheet
      handle
      modal
      open={open}
      onOpenChange={handleOpenChange}
      snapPoints={sheetSnapPoints}
      snapPointsMode="percent"
    >
      {children}
    </Sheet>
  );
}

export const NativeSheet: NativeSheetComponent = Object.assign(NativeSheetRoot, {
  Screen: NativeSheetScreen,
});

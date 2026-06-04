import type {
  DetentChangeEvent,
  DidPresentEvent,
  DragChangeEvent,
  DragEndEvent,
  PositionChangeEvent,
  TrueSheetProps,
  WillPresentEvent,
} from "@lodev09/react-native-true-sheet";
import { useCallback, useMemo } from "react";

import { useTrueSheetOverlayLayoutSetter } from "./overlay_layout_context";

/** 携带 detent / position 的 TrueSheet 布局事件（用于同步 overlay 上下文）。 */
type TrueSheetDetentLayoutEvent =
  | DetentChangeEvent
  | DidPresentEvent
  | DragChangeEvent
  | DragEndEvent
  | PositionChangeEvent
  | WillPresentEvent;

/**
 * 合并 TrueSheet 布局事件与 overlay 上下文同步；回调须写在 `{...sheetProps}` 之后以免被覆盖。
 */
export function useTrueSheetOverlayLayoutSync(
  sheetProps?: Omit<TrueSheetProps, "children" | "header" | "name">,
) {
  const setOverlayLayout = useTrueSheetOverlayLayoutSetter();

  const syncOverlayLayout = useCallback(
    (event: TrueSheetDetentLayoutEvent) => {
      setOverlayLayout?.({
        detent: event.nativeEvent.detent,
        sheetTopPosition: event.nativeEvent.position,
      });
    },
    [setOverlayLayout],
  );

  const resetOverlayLayout = useCallback(() => {
    setOverlayLayout?.({ detent: 1, sheetTopPosition: null });
  }, [setOverlayLayout]);

  return useMemo(
    () => ({
      onDetentChange: (event: DetentChangeEvent) => {
        syncOverlayLayout(event);
        sheetProps?.onDetentChange?.(event);
      },
      onDidDismiss: (event: Parameters<NonNullable<TrueSheetProps["onDidDismiss"]>>[0]) => {
        resetOverlayLayout();
        sheetProps?.onDidDismiss?.(event);
      },
      onDidPresent: (event: DidPresentEvent) => {
        syncOverlayLayout(event);
        sheetProps?.onDidPresent?.(event);
      },
      onDragChange: (event: DragChangeEvent) => {
        syncOverlayLayout(event);
        sheetProps?.onDragChange?.(event);
      },
      onDragEnd: (event: DragEndEvent) => {
        syncOverlayLayout(event);
        sheetProps?.onDragEnd?.(event);
      },
      onPositionChange: (event: PositionChangeEvent) => {
        syncOverlayLayout(event);
        sheetProps?.onPositionChange?.(event);
      },
      onWillPresent: (event: WillPresentEvent) => {
        syncOverlayLayout(event);
        sheetProps?.onWillPresent?.(event);
      },
    }),
    [resetOverlayLayout, sheetProps, syncOverlayLayout],
  );
}

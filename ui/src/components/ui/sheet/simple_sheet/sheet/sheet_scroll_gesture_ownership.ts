export interface SheetScrollGestureOwnershipInput {
  isPaneAtTop: boolean;
  isDraggingDown: boolean;
  currentScrollY: number;
  hasScrollableContent: boolean;
  scrollEngaged: boolean;
  allowSheetDragOnScrollEdge: boolean;
}

export function shouldSheetPanHandleScrollGesture({
  isPaneAtTop,
  isDraggingDown,
  currentScrollY,
  hasScrollableContent,
  scrollEngaged,
  allowSheetDragOnScrollEdge,
}: SheetScrollGestureOwnershipInput): boolean {
  if (!allowSheetDragOnScrollEdge) {
    return false;
  }

  if (!isPaneAtTop) {
    return isDraggingDown ? currentScrollY <= 0 || !hasScrollableContent : true;
  }

  if (isDraggingDown) {
    if (currentScrollY > 0 && hasScrollableContent) {
      return false;
    }

    return scrollEngaged || currentScrollY <= 0 || !hasScrollableContent;
  }

  return !hasScrollableContent;
}

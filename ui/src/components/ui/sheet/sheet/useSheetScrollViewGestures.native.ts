import { useRef } from "react";
import type { GestureResponderEvent, ScrollView as RNScrollView } from "react-native";

import { shouldSheetPanHandleScrollGesture } from "./sheet_scroll_gesture_ownership";
import type { ScrollBridge } from "./types";

interface ResponderState {
  lastPageY: number;
  dragAt: number;
  dys: number[];
  isScrolling: boolean;
  isDraggingScrollArea: boolean;
  scrollEngaged: boolean;
  prevScrollY: number;
  handoffOccurred: boolean;
  handoffDragOffset: number;
  didDragSheet: boolean;
}

interface UseSheetScrollViewGesturesProps {
  scrollRef: React.RefObject<RNScrollView | null>;
  scrollBridge: ScrollBridge;
  hasScrollableContent: boolean;
  scrollEnabled: boolean;
  setScrollEnabled: (enabled: boolean, lockTo?: number) => void;
  allowSheetDragOnScrollEdge: boolean;
}

/**
 * Native gesture handling for Sheet ScrollView.
 * Returns responder props for the ScrollView component.
 */
export function useSheetScrollViewGestures({
  scrollBridge,
  hasScrollableContent,
  scrollEnabled,
  setScrollEnabled,
  allowSheetDragOnScrollEdge,
}: UseSheetScrollViewGesturesProps) {
  const state = useRef<ResponderState>({
    lastPageY: 0,
    dragAt: 0,
    dys: [],
    isScrolling: false,
    isDraggingScrollArea: false,
    scrollEngaged: false,
    prevScrollY: 0,
    handoffOccurred: false,
    handoffDragOffset: 0,
    didDragSheet: false,
  });

  const release = () => {
    const s = state.current;
    if (!s.isDraggingScrollArea) return;

    const didDragSheet = s.didDragSheet;

    s.isDraggingScrollArea = false;
    s.lastPageY = 0;
    s.dragAt = 0;
    scrollBridge.isScrollAreaGestureActive = false;
    scrollBridge.scrollStartY = -1;
    scrollBridge.scrollLock = false;
    scrollBridge.setParentDragging(false);
    s.isScrolling = false;
    s.scrollEngaged = false;
    s.prevScrollY = 0;
    s.handoffOccurred = false;
    s.handoffDragOffset = 0;
    s.didDragSheet = false;
    setScrollEnabled(true);

    if (!didDragSheet) {
      s.dys = [];
      return;
    }

    let vy = 0;
    if (s.dys.length) {
      const recentDys = s.dys.slice(-10);
      const dist = recentDys.reduce((a, b) => a + b, 0);
      vy = (dist / recentDys.length) * 0.04;
    }
    s.dys = [];

    scrollBridge.release({ dragAt: s.dragAt, vy });
  };

  const onStartShouldSetResponder = () => {
    const s = state.current;
    s.lastPageY = 0;
    s.dragAt = 0;
    scrollBridge.isScrollAreaGestureActive = true;
    scrollBridge.scrollStartY = -1;
    s.isDraggingScrollArea = true;
    s.scrollEngaged = scrollBridge.y > 0;
    s.prevScrollY = scrollBridge.y;
    s.handoffOccurred = false;
    s.handoffDragOffset = 0;
    s.didDragSheet = false;
    return false;
  };

  const onMoveShouldSetResponder = (e: GestureResponderEvent) => {
    if (!scrollEnabled) return false;
    const s = state.current;
    const { pageY } = e.nativeEvent;
    if (s.lastPageY === 0) {
      s.lastPageY = pageY;
      return false;
    }
    return Math.abs(pageY - s.lastPageY) > 10;
  };

  const onResponderMove = (e: GestureResponderEvent) => {
    const s = state.current;
    const { pageY } = e.nativeEvent;

    if (!s.isScrolling && scrollBridge.scrollStartY === -1) {
      scrollBridge.scrollStartY = pageY;
      s.lastPageY = pageY;
    }

    const dragAt = pageY - scrollBridge.scrollStartY;
    const dy = pageY - s.lastPageY;
    s.lastPageY = pageY;
    const isDraggingDown = dy > 0;
    const isPaneAtTop = scrollBridge.paneY <= scrollBridge.paneMinY + 5;
    const currentScrollY = scrollBridge.y;

    if (currentScrollY > 0) s.scrollEngaged = true;

    const wasScrolledNowAtZero = s.scrollEngaged && s.prevScrollY > 0 && currentScrollY <= 0;

    if (wasScrolledNowAtZero && !s.handoffOccurred) {
      s.handoffOccurred = true;
      s.handoffDragOffset = 0;
    }

    s.prevScrollY = currentScrollY;

    const effectiveAllowSheetDragOnScrollEdge =
      allowSheetDragOnScrollEdge && !scrollBridge.isScrollIndicatorGestureActive;

    const panHandles = shouldSheetPanHandleScrollGesture({
      isPaneAtTop,
      isDraggingDown,
      currentScrollY,
      hasScrollableContent,
      scrollEngaged: s.scrollEngaged || s.handoffOccurred || wasScrolledNowAtZero,
      allowSheetDragOnScrollEdge: effectiveAllowSheetDragOnScrollEdge,
    });

    if (!panHandles && (!isDraggingDown || !effectiveAllowSheetDragOnScrollEdge)) {
      s.isScrolling = true;
      scrollBridge.scrollLock = true;
      setScrollEnabled(true);
      return;
    }

    if (panHandles) {
      setScrollEnabled(false);
      let effectiveDragAt = dragAt;
      if (s.handoffOccurred) {
        s.handoffDragOffset += dy;
        effectiveDragAt = s.handoffDragOffset;
      }
      scrollBridge.drag(effectiveDragAt);
      s.dragAt = effectiveDragAt;
      s.didDragSheet = true;
      s.dys.push(dy);
      if (s.dys.length > 100) s.dys = s.dys.slice(-10);
    } else {
      setScrollEnabled(true);
    }
  };

  return {
    onResponderRelease: release,
    onStartShouldSetResponder,
    onMoveShouldSetResponder,
    onResponderMove,
  };
}

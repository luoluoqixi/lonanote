import { composeRefs } from "@tamagui/compose-refs";
import { type GetRef, View } from "@tamagui/core";
import type { ScrollViewProps } from "@tamagui/scroll-view";
import { ScrollView } from "@tamagui/scroll-view";
import { useControllableState } from "@tamagui/use-controllable-state";
import React, { useEffect, useRef, useState } from "react";
import {
  type GestureResponderEvent,
  Platform,
  type ScrollView as RNScrollView,
} from "react-native";

import { useGestureSheetContext } from "./GestureSheetContext";
import { useSheetContext } from "./SheetContext";
import { getGestureHandlerState, isGestureHandlerEnabled } from "./gestureState";
import type { SheetScopedProps } from "./types";
import { useSheetScrollViewGestures } from "./useSheetScrollViewGestures";

const SHEET_SCROLL_VIEW_NAME = "SheetScrollView";

interface SheetScrollViewProps extends ScrollViewProps {
  allowSheetDragOnScrollEdge?: boolean;
  sheetDragDisabledScrollIndicatorWidth?: number;
}

export const SheetScrollView = React.forwardRef<GetRef<typeof ScrollView>, SheetScrollViewProps>(
  (
    {
      __scopeSheet,
      allowSheetDragOnScrollEdge = true,
      bounces: bouncesProp,
      children,
      onScroll,
      onMomentumScrollEnd,
      onScrollBeginDrag,
      onScrollEndDrag,
      onTouchCancel,
      onTouchEnd,
      onTouchStart,
      sheetDragDisabledScrollIndicatorWidth = 0,
      scrollEnabled: scrollEnabledProp,
      ...props
    }: SheetScopedProps<SheetScrollViewProps>,
    ref,
  ) => {
    const context = useSheetContext(SHEET_SCROLL_VIEW_NAME, __scopeSheet);
    const gestureContext = useGestureSheetContext();
    const { open, scrollBridge, setHasScrollView, hasFit, screenSize } = context;
    const keyboardOccludedHeight = Math.max(0, context.keyboardOccludedHeight || 0);
    const [scrollEnabled] = useControllableState({
      prop: scrollEnabledProp,
      defaultProp: true,
    });
    const scrollRef = React.useRef<RNScrollView | null>(null);

    const [hasScrollableContent, setHasScrollableContent] = useState(true);
    const parentHeight = useRef(0);
    const parentWidth = useRef(0);
    const contentHeight = useRef(0);

    // with snapPointsMode="fit", Frame is content-sized (flex: 0, flex-basis: auto, height: undefined).
    // a flex: 1 child can't grow inside a content-sized parent, so the ScrollView (and the Frame
    // around it) collapse to 0 height. instead, let the ScrollView size to its content and cap it
    // at the available viewport (screenSize / maxContentSize) so scrolling kicks in for tall content.
    // when the keyboard forces the sheet against the top safe area, preserve the measured viewport
    // height while adding scrollable tail padding so content can move above the keyboard.
    const keyboardFrozenHeight =
      hasFit && keyboardOccludedHeight > 0 && parentHeight.current
        ? parentHeight.current
        : undefined;
    const fitSizingStyle = hasFit
      ? {
          flex: undefined as undefined,
          height: keyboardFrozenHeight,
          maxHeight: screenSize || undefined,
        }
      : { flex: 1 };

    const panGestureRef = gestureContext?.panGestureRef;
    const { ScrollView: RNGHScrollView } = getGestureHandlerState();
    const useRNGHScrollView = isGestureHandlerEnabled() && RNGHScrollView && panGestureRef;
    const scrollBounces = bouncesProp ?? Platform.OS === "ios";

    // RNGH scroll locking state
    const currentScrollOffset = useRef(0);
    const lockedScrollY = useRef(0);

    const isTouchInScrollIndicatorDragArea = (event: GestureResponderEvent) => {
      if (sheetDragDisabledScrollIndicatorWidth <= 0 || parentWidth.current <= 0) {
        return false;
      }

      const { locationX } = event.nativeEvent;

      return locationX >= parentWidth.current - sheetDragDisabledScrollIndicatorWidth;
    };

    const markScrollAreaGestureActive = (active: boolean, event?: GestureResponderEvent) => {
      scrollBridge.isScrollAreaGestureActive = active;

      if (!active) {
        scrollBridge.isScrollIndicatorGestureActive = false;
        return;
      }

      if (event) {
        scrollBridge.isScrollIndicatorGestureActive = isTouchInScrollIndicatorDragArea(event);
      }
    };

    const handleTouchStart = (event: Parameters<NonNullable<typeof onTouchStart>>[0]) => {
      markScrollAreaGestureActive(true, event);
      onTouchStart?.(event);
    };

    const handleTouchEnd = (event: Parameters<NonNullable<typeof onTouchEnd>>[0]) => {
      markScrollAreaGestureActive(false);
      onTouchEnd?.(event);
    };

    const handleTouchCancel = (event: Parameters<NonNullable<typeof onTouchCancel>>[0]) => {
      markScrollAreaGestureActive(false);
      onTouchCancel?.(event);
    };

    const handleScrollBeginDrag = (event: Parameters<NonNullable<typeof onScrollBeginDrag>>[0]) => {
      markScrollAreaGestureActive(true);
      onScrollBeginDrag?.(event);
    };

    const handleScrollEndDrag = (event: Parameters<NonNullable<typeof onScrollEndDrag>>[0]) => {
      markScrollAreaGestureActive(false);
      onScrollEndDrag?.(event);
    };

    const handleMomentumScrollEnd = (
      event: Parameters<NonNullable<typeof onMomentumScrollEnd>>[0],
    ) => {
      markScrollAreaGestureActive(false);
      onMomentumScrollEnd?.(event);
    };

    const setScrollEnabled = (next: boolean, lockTo?: number) => {
      if (!next) {
        const lockY = lockTo ?? currentScrollOffset.current;
        lockedScrollY.current = lockY;
        scrollBridge.scrollLockY = lockY;
        scrollRef.current?.scrollTo?.({ x: 0, y: lockY, animated: false });
      } else {
        lockedScrollY.current = currentScrollOffset.current;
        scrollBridge.scrollLockY = undefined;
      }
    };

    const forceScrollTo = (y: number) => {
      scrollRef.current?.scrollTo?.({ x: 0, y, animated: false });
    };

    useEffect(() => {
      if (open) {
        return;
      }

      scrollBridge.scrollLock = false;
      scrollBridge.scrollLockY = undefined;
      scrollBridge.scrollStartY = -1;
      scrollBridge.setParentDragging(false);
      setScrollEnabled(true);
    }, [open, scrollBridge]);

    useEffect(() => {
      setHasScrollView(true);
      scrollBridge.allowSheetDragOnScrollEdge = allowSheetDragOnScrollEdge;
      if (isGestureHandlerEnabled()) {
        scrollBridge.setScrollEnabled = setScrollEnabled;
        scrollBridge.forceScrollTo = forceScrollTo;
      }
      return () => {
        // Select 这类通过 Adapt 即开即卸载的 Sheet.ScrollView 若在关闭前留下锁定态，
        // 外层页面滚动可能继续被视为“仍在 sheet 拖拽中”。卸载时主动归零桥状态。
        scrollBridge.scrollLock = false;
        scrollBridge.scrollLockY = undefined;
        scrollBridge.scrollStartY = -1;
        scrollBridge.isAtTop = undefined;
        scrollBridge.isScrollAreaGestureActive = false;
        scrollBridge.isScrollIndicatorGestureActive = false;
        scrollBridge.allowSheetDragOnScrollEdge = true;
        scrollBridge.setParentDragging(false);
        setScrollEnabled(true);
        setHasScrollView(false);
        scrollBridge.setScrollEnabled = undefined;
        scrollBridge.forceScrollTo = undefined;
      };
    }, [allowSheetDragOnScrollEdge, scrollBridge]);

    const updateScrollable = () => {
      if (parentHeight.current && contentHeight.current) {
        setHasScrollableContent(contentHeight.current > parentHeight.current);
      }
    };

    useEffect(() => {
      scrollBridge.hasScrollableContent = hasScrollableContent;
    }, [hasScrollableContent]);

    // platform-specific gesture handling
    const gestureProps = useSheetScrollViewGestures({
      scrollRef,
      scrollBridge,
      hasScrollableContent,
      scrollEnabled,
      setScrollEnabled,
      allowSheetDragOnScrollEdge,
    });

    // content wrapper for measuring height
    const contentWrapper = (
      <View
        onLayout={(e) => {
          const height = Math.floor(e.nativeEvent.layout.height);
          if (height !== contentHeight.current) {
            contentHeight.current = height;
            updateScrollable();
          }
        }}
      >
        {children}
        {keyboardOccludedHeight > 0 && (
          <View data-sheet-keyboard-scroll-pad height={keyboardOccludedHeight} width="100%" />
        )}
      </View>
    );

    // RNGH ScrollView path
    if (useRNGHScrollView && RNGHScrollView && panGestureRef) {
      const RNGHComponent = RNGHScrollView as any;
      return (
        <RNGHComponent
          ref={composeRefs(scrollRef as any, ref)}
          style={fitSizingStyle}
          scrollEventThrottle={1}
          scrollEnabled={scrollEnabled}
          simultaneousHandlers={[panGestureRef]}
          onLayout={(e: any) => {
            parentHeight.current = Math.ceil(e.nativeEvent.layout.height);
            parentWidth.current = Math.ceil(e.nativeEvent.layout.width);
            updateScrollable();
          }}
          onScroll={(e: any) => {
            const { y } = e.nativeEvent.contentOffset;
            currentScrollOffset.current = y;

            if (scrollBridge.scrollLockY !== undefined) {
              if (y !== scrollBridge.scrollLockY) {
                scrollRef.current?.scrollTo?.({
                  x: 0,
                  y: scrollBridge.scrollLockY,
                  animated: false,
                });
              }
              scrollBridge.y = scrollBridge.scrollLockY;
              onScroll?.({
                ...e,
                nativeEvent: {
                  ...e.nativeEvent,
                  contentOffset: {
                    ...e.nativeEvent.contentOffset,
                    y: scrollBridge.scrollLockY,
                  },
                },
              });
              return;
            }

            scrollBridge.y = y;
            if (y > 0) scrollBridge.scrollStartY = -1;
            onScroll?.(e);
          }}
          contentContainerStyle={{ minHeight: "100%" } as any}
          bounces={scrollBounces}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          {...props}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onTouchCancel={handleTouchCancel}
          onTouchEnd={handleTouchEnd}
          onTouchStart={handleTouchStart}
        >
          {contentWrapper}
        </RNGHComponent>
      );
    }

    // fallback ScrollView with platform-specific gesture props
    return (
      <ScrollView
        onLayout={(e) => {
          parentHeight.current = Math.ceil(e.nativeEvent.layout.height);
          parentWidth.current = Math.ceil(e.nativeEvent.layout.width);
          updateScrollable();
        }}
        ref={composeRefs(scrollRef as any, ref)}
        {...fitSizingStyle}
        scrollEventThrottle={1}
        className="_ovs-contain"
        scrollEnabled={scrollEnabled}
        onScroll={(e) => {
          const { y } = e.nativeEvent.contentOffset;
          scrollBridge.y = y;
          if (y > 0) scrollBridge.scrollStartY = -1;
          onScroll?.(e);
        }}
        contentContainerStyle={{ minHeight: "100%" } as any}
        {...gestureProps}
        {...props}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onTouchCancel={handleTouchCancel}
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
      >
        {contentWrapper}
      </ScrollView>
    );
  },
);

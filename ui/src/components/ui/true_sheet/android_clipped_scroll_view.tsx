import { type ForwardedRef, type ReactNode, forwardRef, useEffect, useRef, useState } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

type AndroidClippedScrollViewProps = Omit<ScrollViewProps, "children"> & {
  children: ReactNode;
};

const MIN_THUMB_HEIGHT = 24;

function setForwardedRef<T>(ref: ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref != null) {
    ref.current = value;
  }
}

/**
 * Android 嵌套 TrueSheet 会裁剪 ScrollView，但系统滚动条仍按未裁剪高度绘制。
 * 保留原 ScrollView 负责滚动，仅用覆盖层按屏幕内真实可见高度绘制指示器。
 */
export const AndroidClippedScrollView = forwardRef<ScrollView, AndroidClippedScrollViewProps>(
  (
    {
      children,
      onContentSizeChange,
      onLayout,
      onMomentumScrollBegin,
      onMomentumScrollEnd,
      onScroll,
      onScrollBeginDrag,
      onScrollEndDrag,
      scrollEventThrottle,
      showsVerticalScrollIndicator = true,
      ...props
    },
    forwardedRef,
  ) => {
    const { height: windowHeight } = useWindowDimensions();
    const scrollRef = useRef<ScrollView | null>(null);
    const scrollOffsetY = useRef(new Animated.Value(0)).current;
    const indicatorOpacity = useRef(new Animated.Value(0)).current;
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [contentHeight, setContentHeight] = useState(0);
    const [visibleHeight, setVisibleHeight] = useState(0);

    function clearHideTimer() {
      if (hideTimerRef.current != null) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    }

    function showIndicator() {
      clearHideTimer();
      indicatorOpacity.stopAnimation();
      indicatorOpacity.setValue(1);
    }

    function scheduleHideIndicator() {
      clearHideTimer();
      hideTimerRef.current = setTimeout(() => {
        Animated.timing(indicatorOpacity, {
          duration: 220,
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }, 500);
    }

    function measureVisibleHeight() {
      requestAnimationFrame(() => {
        scrollRef.current
          ?.getNativeScrollRef()
          ?.measureInWindow((_x, y, _width, measuredHeight) => {
            const nextVisibleHeight = Math.max(
              0,
              Math.min(measuredHeight, Math.round(windowHeight - y)),
            );
            setVisibleHeight((currentHeight) =>
              currentHeight === nextVisibleHeight ? currentHeight : nextVisibleHeight,
            );
          });
      });
    }

    useEffect(() => {
      measureVisibleHeight();
    }, [windowHeight]);

    useEffect(
      () => () => {
        clearHideTimer();
      },
      [],
    );

    const handleScroll = Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollOffsetY } } }],
      {
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          onScroll?.(event);
        },
        useNativeDriver: true,
      },
    );

    const thumbHeight =
      visibleHeight > 0 && contentHeight > visibleHeight
        ? Math.max(MIN_THUMB_HEIGHT, (visibleHeight * visibleHeight) / contentHeight)
        : 0;
    const maxScrollOffset = Math.max(0, contentHeight - visibleHeight);
    const maxThumbOffset = Math.max(0, visibleHeight - thumbHeight);
    const thumbTranslateY =
      maxScrollOffset > 0
        ? scrollOffsetY.interpolate({
            extrapolate: "clamp",
            inputRange: [0, maxScrollOffset],
            outputRange: [0, maxThumbOffset],
          })
        : 0;
    const showCustomIndicator =
      showsVerticalScrollIndicator && visibleHeight > 0 && contentHeight > visibleHeight;

    return (
      <Animated.ScrollView
        {...props}
        ref={(instance) => {
          const scrollView = instance as unknown as ScrollView | null;
          scrollRef.current = scrollView;
          setForwardedRef(forwardedRef, scrollView);
        }}
        onContentSizeChange={(width, height) => {
          setContentHeight(height);
          onContentSizeChange?.(width, height);
        }}
        onLayout={(event: LayoutChangeEvent) => {
          measureVisibleHeight();
          onLayout?.(event);
        }}
        onMomentumScrollBegin={(event) => {
          showIndicator();
          measureVisibleHeight();
          onMomentumScrollBegin?.(event);
        }}
        onMomentumScrollEnd={(event) => {
          scheduleHideIndicator();
          onMomentumScrollEnd?.(event);
        }}
        onScroll={handleScroll}
        onScrollBeginDrag={(event) => {
          showIndicator();
          measureVisibleHeight();
          onScrollBeginDrag?.(event);
        }}
        onScrollEndDrag={(event) => {
          scheduleHideIndicator();
          onScrollEndDrag?.(event);
        }}
        scrollEventThrottle={scrollEventThrottle ?? 16}
        showsVerticalScrollIndicator={false}
      >
        {children}
        {showCustomIndicator ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicatorTrack,
              {
                height: visibleHeight,
                opacity: indicatorOpacity,
                transform: [{ translateY: scrollOffsetY }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.indicatorThumb,
                {
                  height: thumbHeight,
                  transform: [{ translateY: thumbTranslateY }],
                },
              ]}
            />
          </Animated.View>
        ) : null}
      </Animated.ScrollView>
    );
  },
);
AndroidClippedScrollView.displayName = "AndroidClippedScrollView";

const styles = StyleSheet.create({
  indicatorThumb: {
    backgroundColor: "rgba(128, 128, 128, 0.72)",
    borderRadius: 1.5,
    width: 3,
  },
  indicatorTrack: {
    alignItems: "flex-end",
    position: "absolute",
    right: 2,
    top: 0,
    width: 3,
    zIndex: 100,
  },
});

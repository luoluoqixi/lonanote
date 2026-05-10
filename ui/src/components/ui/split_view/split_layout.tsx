import clsx from "clsx";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
  PanResponder,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { isMobile, isWeb } from "@/api/common/platform";

import { LayoutService } from "./layout_service";
import { PaneView } from "./pane_view";
import { SplitLayoutProvider, useSplitLayoutStorage } from "./split_layout_provider";
import { type SplitViewDescriptor, SplitViewModel } from "./split_view_model";
import {
  type PaneDescriptor,
  type SplitLayoutHandle,
  type SplitLayoutPaneProps,
  SplitLayoutPriority,
  type SplitLayoutProps,
  type SplitLayoutState,
} from "./types";

const DEFAULT_SASH_SIZE = 8;
const MOBILE_SASH_SIZE = 20;
const MOBILE_SASH_INDICATOR_SIZE = 3;
const IS_WEB = isWeb();
const IS_MOBILE = isMobile();

const getPointerCoordinate = (
  event: Pick<PointerEvent, "clientX" | "clientY">,
  vertical: boolean,
) => {
  return vertical ? event.clientY : event.clientX;
};

const bindDocumentPointerDrag = (onMove: (event: PointerEvent) => void, onEnd: () => void) => {
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onEnd);
  document.addEventListener("pointercancel", onEnd);

  return () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onEnd);
    document.removeEventListener("pointercancel", onEnd);
  };
};

const SplitLayoutInner = forwardRef<SplitLayoutHandle, SplitLayoutProps>(
  (
    {
      children,
      className,
      defaultSizes,
      maxSize = Number.POSITIVE_INFINITY,
      minSize = 30,
      onChange,
      onDragEnd,
      onDragStart,
      onReset,
      onStateChange,
      onVisibleChange,
      proportionalLayout = true,
      separator = true,
      snap = false,
      storageKey,
      style,
      vertical = false,
    },
    ref,
  ) => {
    const layoutServiceRef = useRef(new LayoutService());
    const modelRef = useRef<SplitViewModel | null>(null);
    const initialStoredStateHydratedRef = useRef(false);
    const initialStoredStateRef = useRef<SplitLayoutState | undefined>(undefined);
    const panesRef = useRef<PaneDescriptor[]>([]);
    const callbacksRef = useRef({
      onChange,
      onDragEnd,
      onDragStart,
      onStateChange,
      onVisibleChange,
    });
    const webDragCleanupRef = useRef<(() => void) | null>(null);
    const webDraggingRef = useRef(false);
    const [activeSashIndex, setActiveSashIndex] = useState<number | null>(null);
    const [dragging, setDragging] = useState(false);
    const [layoutSize, setLayoutSize] = useState(0);
    const [sizes, setSizes] = useState<number[]>([]);
    const [visible, setVisible] = useState<boolean[]>([]);
    const {
      ready: storageReady,
      state: storedState,
      setState: setStoredState,
    } = useSplitLayoutStorage(storageKey);

    useEffect(() => {
      callbacksRef.current = {
        onChange,
        onDragEnd,
        onDragStart,
        onStateChange,
        onVisibleChange,
      };
    }, [onChange, onDragEnd, onDragStart, onStateChange, onVisibleChange]);

    useEffect(() => {
      return () => {
        webDragCleanupRef.current?.();
        webDragCleanupRef.current = null;
      };
    }, []);

    const panes = useMemo(
      () => normalizePanes(children, minSize, maxSize, snap),
      [children, maxSize, minSize, snap],
    );
    const paneConfigKey = useMemo(() => getPaneConfigKey(panes), [panes]);
    panesRef.current = panes;

    const emitState = useCallback((model: SplitViewModel) => {
      const state = model.getState();
      setSizes(state.sizes);
      setVisible(state.visible);
      callbacksRef.current.onStateChange?.(state);
      return state;
    }, []);

    const persistState = useCallback(
      (state?: SplitLayoutState) => {
        const nextState = state ?? modelRef.current?.getState();
        if (nextState) {
          setStoredState(nextState);
        }
      },
      [setStoredState],
    );

    useEffect(() => {
      if (!storageReady) {
        initialStoredStateHydratedRef.current = false;
        initialStoredStateRef.current = undefined;
        return;
      }

      if (!initialStoredStateHydratedRef.current) {
        initialStoredStateRef.current = storedState;
        initialStoredStateHydratedRef.current = true;
      }
    }, [storageReady, storedState]);

    const createModel = useCallback(() => {
      const currentPanes = panesRef.current;
      if (!storageReady || layoutSize <= 0 || currentPanes.length === 0) return null;

      layoutServiceRef.current.setSize(layoutSize);
      const sourceState = modelRef.current?.getState() ?? initialStoredStateRef.current;
      const canUseStoredState =
        sourceState?.sizes.length === currentPanes.length &&
        sourceState.visible.length === currentPanes.length;
      const canUseDefaultSizes = defaultSizes?.length === currentPanes.length;

      const descriptorViews: SplitViewDescriptor["views"] = currentPanes.map((pane, index) => {
        const view = new PaneView(layoutServiceRef.current, {
          maximumSize: pane.maxSize,
          minimumSize: pane.minSize,
          preferredSize: pane.preferredSize,
          priority: pane.priority,
          snap: pane.snap,
        });
        const preferredSize = resolvePreferredSize(pane.preferredSize, layoutSize) ?? pane.minSize;
        const storedSize = canUseStoredState ? sourceState.sizes[index] : undefined;
        const defaultSize = canUseDefaultSizes ? defaultSizes[index] : undefined;
        const visibleSize = clamp(
          storedSize ?? defaultSize ?? preferredSize,
          pane.minSize,
          Math.min(pane.maxSize, layoutSize),
        );
        const isVisible = pane.visible ?? (canUseStoredState ? sourceState.visible[index] : true);

        return {
          size: isVisible ? visibleSize : { cachedVisibleSize: visibleSize || preferredSize },
          view,
        };
      });

      const descriptor: SplitViewDescriptor = {
        size: descriptorViews.reduce(
          (sum, item) => sum + (typeof item.size === "number" ? item.size : 0),
          0,
        ),
        views: descriptorViews,
      };
      const model = new SplitViewModel({ descriptor, proportionalLayout });

      model.onDidChange = (nextSizes) => {
        setSizes(nextSizes);
        callbacksRef.current.onChange?.(nextSizes);
        callbacksRef.current.onStateChange?.(model.getState());
      };
      model.onDidVisibleChange = (index, nextVisible) => {
        setVisible(model.getState().visible);
        callbacksRef.current.onVisibleChange?.(index, nextVisible);
        persistState(model.getState());
      };
      model.layout(layoutSize);
      modelRef.current = model;
      persistState(emitState(model));
      return model;
    }, [defaultSizes, emitState, layoutSize, persistState, proportionalLayout, storageReady]);

    useEffect(() => {
      createModel();
    }, [createModel, paneConfigKey]);

    useEffect(() => {
      if (!dragging || typeof document === "undefined") return;

      const cursor = vertical ? "ns-resize" : "ew-resize";
      const previousBodyCursor = document.body.style.cursor;
      const previousDocumentCursor = document.documentElement.style.cursor;
      const previousBodyUserSelect = document.body.style.userSelect;
      const previousDocumentUserSelect = document.documentElement.style.userSelect;

      document.body.style.cursor = cursor;
      document.documentElement.style.cursor = cursor;
      document.body.style.userSelect = "none";
      document.documentElement.style.userSelect = "none";

      return () => {
        document.body.style.cursor = previousBodyCursor;
        document.documentElement.style.cursor = previousDocumentCursor;
        document.body.style.userSelect = previousBodyUserSelect;
        document.documentElement.style.userSelect = previousDocumentUserSelect;
      };
    }, [dragging, vertical]);

    useEffect(() => {
      const model = modelRef.current;
      if (!model) return;

      panes.forEach((pane, index) => {
        if (pane.visible !== undefined && model.isViewVisible(index) !== pane.visible) {
          model.setViewVisible(index, pane.visible);
          persistState(model.getState());
        }
      });
    }, [paneConfigKey, panes, persistState]);

    useImperativeHandle(
      ref,
      () => ({
        getState: () => modelRef.current?.getState() ?? { sizes, visible },
        reset: () => {
          if (onReset) {
            onReset();
            return;
          }

          const model = modelRef.current;
          if (!model) return;
          model.distributeViewSizes();
          panes.forEach((pane, index) => {
            const preferredSize = resolvePreferredSize(pane.preferredSize, layoutSize);
            if (preferredSize !== undefined) model.resizeView(index, preferredSize);
          });
          persistState(emitState(model));
        },
        resize: (nextSizes) => {
          const model = modelRef.current;
          if (!model) return;
          model.resizeViews(nextSizes);
          persistState(emitState(model));
        },
        setVisible: (index, nextVisible) => {
          const model = modelRef.current;
          if (!model) return;
          model.setViewVisible(index, nextVisible);
          persistState(emitState(model));
        },
      }),
      [emitState, layoutSize, onReset, panes, persistState, sizes, visible],
    );

    const handleLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const nextLayoutSize = vertical
          ? event.nativeEvent.layout.height
          : event.nativeEvent.layout.width;
        if (nextLayoutSize > 0 && Math.round(nextLayoutSize) !== Math.round(layoutSize)) {
          setLayoutSize(nextLayoutSize);
          layoutServiceRef.current.setSize(nextLayoutSize);
          modelRef.current?.layout(nextLayoutSize);
        }
      },
      [layoutSize, vertical],
    );

    const offsets = useMemo(() => getOffsets(sizes), [sizes]);

    const startDrag = useCallback((index: number) => {
      const model = modelRef.current;
      if (!model) return false;

      model.startSashDrag(index, 0);
      setActiveSashIndex(index);
      setDragging(true);
      callbacksRef.current.onDragStart?.(model.getState().sizes);
      return true;
    }, []);

    const moveDrag = useCallback((delta: number) => {
      const model = modelRef.current;
      if (!model) return;
      model.changeSashDrag(delta);
    }, []);

    const finishDrag = useCallback(() => {
      const model = modelRef.current;
      if (!model) return;

      model.endSashDrag();
      const state = emitState(model);
      persistState(state);
      setActiveSashIndex(null);
      setDragging(false);
      webDraggingRef.current = false;
      callbacksRef.current.onDragEnd?.(state.sizes);
    }, [emitState, persistState]);

    const bindWebPointerTracking = useCallback(
      (startPointer: number) => {
        if (!IS_WEB || typeof document === "undefined") return;

        const handlePointerMove = (moveEvent: PointerEvent) => {
          const currentPointer = getPointerCoordinate(moveEvent, vertical);
          moveDrag(currentPointer - startPointer);
        };
        const handlePointerUp = () => {
          webDragCleanupRef.current?.();
          webDragCleanupRef.current = null;
          finishDrag();
        };

        const removeListeners = bindDocumentPointerDrag(handlePointerMove, handlePointerUp);
        webDragCleanupRef.current = () => {
          removeListeners();
          webDraggingRef.current = false;
        };
      },
      [finishDrag, moveDrag, vertical],
    );

    const startWebSashDrag = useCallback(
      (index: number) => (event: PointerEvent | React.PointerEvent) => {
        if (!IS_WEB) return;
        if (webDraggingRef.current) return;

        event.preventDefault?.();
        webDragCleanupRef.current?.();

        if (!startDrag(index)) return;

        webDraggingRef.current = true;
        const startPointer = getPointerCoordinate(event, vertical);
        bindWebPointerTracking(startPointer);
      },
      [bindWebPointerTracking, startDrag, vertical],
    );

    const sashPanResponders = useMemo(() => {
      if (IS_WEB) return [];

      return Array.from({ length: Math.max(panes.length - 1, 0) }, (_, index) =>
        PanResponder.create({
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: () => {
            startDrag(index);
          },
          onPanResponderMove: (_event, gestureState) => {
            moveDrag(vertical ? gestureState.dy : gestureState.dx);
          },
          onPanResponderRelease: () => {
            finishDrag();
          },
          onPanResponderTerminate: () => {
            finishDrag();
          },
          onStartShouldSetPanResponder: () => true,
        }),
      );
    }, [finishDrag, moveDrag, panes.length, startDrag, vertical]);

    return (
      <View
        className={clsx(
          "split-layout",
          vertical ? "split-layout--vertical" : "split-layout--horizontal",
          separator && "split-layout--separator",
          dragging && "split-layout--dragging",
          className,
        )}
        onLayout={handleLayout}
        style={[styles.root, style]}
      >
        <View className="split-layout__container" style={styles.container}>
          {panes.map((pane, index) => {
            const paneSize = sizes[index] ?? 0;
            const paneOffset = offsets[index] ?? 0;
            const paneStyle = vertical
              ? ({ top: paneOffset, height: paneSize, left: 0, right: 0 } satisfies ViewStyle)
              : ({ left: paneOffset, width: paneSize, top: 0, bottom: 0 } satisfies ViewStyle);

            return (
              <View
                key={pane.key}
                className={clsx(
                  "split-layout__pane",
                  !visible[index] && "split-layout__pane--hidden",
                  pane.className,
                )}
                style={[styles.pane, paneStyle, pane.style] as StyleProp<ViewStyle>}
              >
                {pane.children}
              </View>
            );
          })}
          {panes.slice(0, -1).map((pane, index) => {
            if (!canRenderSash(panes, index)) return null;

            const sashSize = IS_MOBILE ? MOBILE_SASH_SIZE : DEFAULT_SASH_SIZE;

            const sashOffset = (offsets[index] ?? 0) + (sizes[index] ?? 0) - sashSize / 2;
            const sashStyle = vertical
              ? ({
                  top: sashOffset,
                  height: sashSize,
                  left: 0,
                  right: 0,
                } satisfies ViewStyle)
              : ({
                  left: sashOffset,
                  width: sashSize,
                  top: 0,
                  bottom: 0,
                } satisfies ViewStyle);
            const mobileIndicatorStyle = vertical
              ? styles.mobileSashIndicatorHorizontal
              : styles.mobileSashIndicatorVertical;

            return (
              <View
                key={`${pane.key}-sash`}
                className={clsx(
                  "split-layout__sash",
                  activeSashIndex === index && "split-layout__sash--active",
                  vertical ? "split-layout__sash--horizontal" : "split-layout__sash--vertical",
                )}
                style={[styles.sash, sashStyle]}
                {...(IS_WEB
                  ? ({
                      onPointerDown: startWebSashDrag(index),
                    } as any)
                  : sashPanResponders[index]?.panHandlers)}
              >
                {IS_MOBILE ? (
                  <View
                    pointerEvents="none"
                    className={clsx("bg-foreground/20", activeSashIndex === index && "bg-accent")}
                    style={[styles.mobileSashIndicator, mobileIndicatorStyle]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  },
);

const SplitLayoutPane = forwardRef<View, SplitLayoutPaneProps>(
  ({ className, children, style }, ref) => {
    return (
      <View ref={ref} className={className} style={style}>
        {children}
      </View>
    );
  },
);

SplitLayoutPane.displayName = "SplitLayout.Pane";

const resolvePreferredSize = (preferredSize: number | string | undefined, layoutSize: number) => {
  if (typeof preferredSize === "number") return preferredSize;
  if (typeof preferredSize !== "string") return undefined;

  const value = preferredSize.trim();
  if (value.endsWith("%")) {
    const proportion = Number(value.slice(0, -1)) / 100;
    return Number.isFinite(proportion) ? proportion * layoutSize : undefined;
  }

  if (value.endsWith("px")) {
    const pixels = Number(value.slice(0, -2));
    return Number.isFinite(pixels) ? pixels : undefined;
  }

  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : undefined;
};

const clamp = (value: number, minimum: number, maximum: number) => {
  return Math.min(Math.max(value, minimum), maximum);
};

const isPaneElement = (child: React.ReactElement) => {
  return (child.type as { displayName?: string }).displayName === SplitLayoutPane.displayName;
};

const normalizePanes = (
  children: React.ReactNode,
  parentMinSize: number,
  parentMaxSize: number,
  parentSnap: boolean,
): PaneDescriptor[] => {
  return React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child, index) => {
      const key = child.key == null ? `split-pane-${index}` : String(child.key);

      if (isPaneElement(child)) {
        const props = child.props as SplitLayoutPaneProps;
        return {
          key,
          children: props.children,
          className: props.className,
          maxSize: props.maxSize ?? parentMaxSize,
          minSize: props.minSize ?? parentMinSize,
          preferredSize: props.preferredSize,
          priority: props.priority ?? SplitLayoutPriority.Normal,
          snap: props.snap ?? parentSnap,
          style: props.style,
          visible: props.visible,
        };
      }

      return {
        key,
        children: child,
        maxSize: parentMaxSize,
        minSize: parentMinSize,
        priority: SplitLayoutPriority.Normal,
        snap: parentSnap,
      };
    });
};

const getPaneConfigKey = (panes: PaneDescriptor[]) => {
  return panes
    .map((pane) => {
      return [
        pane.key,
        pane.minSize,
        pane.maxSize,
        pane.preferredSize,
        pane.priority,
        pane.snap,
      ].join(":");
    })
    .join("|");
};

const getOffsets = (sizes: number[]) => {
  let offset = 0;
  return sizes.map((size) => {
    const current = offset;
    offset += size;
    return current;
  });
};

const canRenderSash = (panes: PaneDescriptor[], index: number) => {
  const currentPane = panes[index];
  const nextPane = panes[index + 1];
  if (!currentPane || !nextPane) return false;

  const currentResizable = currentPane.maxSize > currentPane.minSize;
  const nextResizable = nextPane.maxSize > nextPane.minSize;
  return currentResizable && nextResizable;
};

export const SplitLayout = Object.assign(
  forwardRef<SplitLayoutHandle, SplitLayoutProps>(
    ({ storageFallbackState, storageKey, ...props }, ref) => {
      if (storageKey || storageFallbackState) {
        return (
          <SplitLayoutProvider fallbackState={storageFallbackState} storageKey={storageKey}>
            <SplitLayoutInner ref={ref} {...props} />
          </SplitLayoutProvider>
        );
      }

      return <SplitLayoutInner ref={ref} {...props} />;
    },
  ),
  { Pane: SplitLayoutPane, Provider: SplitLayoutProvider },
);

const styles = StyleSheet.create({
  container: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  pane: {
    overflow: "hidden",
    position: "absolute",
  },
  root: {
    height: "100%",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  sash: {
    position: "absolute",
    zIndex: 20,
  },
  mobileSashIndicator: {
    position: "absolute",
  },
  mobileSashIndicatorHorizontal: {
    height: MOBILE_SASH_INDICATOR_SIZE,
    left: 0,
    right: 0,
    top: (MOBILE_SASH_SIZE - MOBILE_SASH_INDICATOR_SIZE) / 2,
  },
  mobileSashIndicatorVertical: {
    bottom: 0,
    top: 0,
    width: MOBILE_SASH_INDICATOR_SIZE,
    left: (MOBILE_SASH_SIZE - MOBILE_SASH_INDICATOR_SIZE) / 2,
  },
});

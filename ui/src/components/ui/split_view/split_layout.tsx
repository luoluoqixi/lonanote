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

import { LayoutService } from "./layout_service";
import { PaneView } from "./pane_view";
import { type SplitViewDescriptor, SplitViewModel } from "./split_view_model";
import { readSplitLayoutState, writeSplitLayoutState } from "./storage";
import {
  type PaneDescriptor,
  type SplitLayoutHandle,
  type SplitLayoutPaneProps,
  SplitLayoutPriority,
  type SplitLayoutProps,
  type SplitLayoutState,
} from "./types";

const DEFAULT_SASH_SIZE = 8;

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
      const panesRef = useRef<PaneDescriptor[]>([]);
      const [dragging, setDragging] = useState(false);
      const [layoutSize, setLayoutSize] = useState(0);
      const [sizes, setSizes] = useState<number[]>([]);
      const [visible, setVisible] = useState<boolean[]>([]);

      const panes = useMemo(
        () => normalizePanes(children, minSize, maxSize, snap),
        [children, maxSize, minSize, snap],
      );
      const paneConfigKey = useMemo(() => getPaneConfigKey(panes), [panes]);
      panesRef.current = panes;

      const emitState = useCallback(
        (model: SplitViewModel) => {
          const state = model.getState();
          setSizes(state.sizes);
          setVisible(state.visible);
          onStateChange?.(state);
          return state;
        },
        [onStateChange],
      );

      const persistState = useCallback(
        (state?: SplitLayoutState) => {
          const nextState = state ?? modelRef.current?.getState();
          if (nextState) writeSplitLayoutState(storageKey, nextState);
        },
        [storageKey],
      );

      const createModel = useCallback(() => {
        const currentPanes = panesRef.current;
        if (layoutSize <= 0 || currentPanes.length === 0) return null;

        layoutServiceRef.current.setSize(layoutSize);
        const storedState = readSplitLayoutState(storageKey);
        const canUseStoredState =
          storedState?.sizes.length === currentPanes.length &&
          storedState.visible.length === currentPanes.length;
        const canUseDefaultSizes = defaultSizes?.length === currentPanes.length;

        const descriptorViews: SplitViewDescriptor["views"] = currentPanes.map((pane, index) => {
          const view = new PaneView(layoutServiceRef.current, {
            maximumSize: pane.maxSize,
            minimumSize: pane.minSize,
            preferredSize: pane.preferredSize,
            priority: pane.priority,
            snap: pane.snap,
          });
          const preferredSize =
            resolvePreferredSize(pane.preferredSize, layoutSize) ?? pane.minSize;
          const storedSize = canUseStoredState ? storedState.sizes[index] : undefined;
          const defaultSize = canUseDefaultSizes ? defaultSizes[index] : undefined;
          const visibleSize = clamp(
            storedSize ?? defaultSize ?? preferredSize,
            pane.minSize,
            Math.min(pane.maxSize, layoutSize),
          );
          const isVisible = pane.visible ?? (canUseStoredState ? storedState.visible[index] : true);

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
          onChange?.(nextSizes);
          onStateChange?.(model.getState());
        };
        model.onDidVisibleChange = (index, nextVisible) => {
          setVisible(model.getState().visible);
          onVisibleChange?.(index, nextVisible);
          persistState(model.getState());
        };
        model.layout(layoutSize);
        modelRef.current = model;
        persistState(emitState(model));
        return model;
      }, [
        defaultSizes,
        emitState,
        layoutSize,
        onChange,
        onStateChange,
        onVisibleChange,
        persistState,
        proportionalLayout,
        storageKey,
      ]);

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

      const sashPanResponders = useMemo(() => {
        return Array.from({ length: Math.max(panes.length - 1, 0) }, (_, index) =>
          PanResponder.create({
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
              const model = modelRef.current;
              if (!model) return;
              model.startSashDrag(index, 0);
              setDragging(true);
              onDragStart?.(model.getState().sizes);
            },
            onPanResponderMove: (_event, gestureState) => {
              const model = modelRef.current;
              if (!model) return;
              model.changeSashDrag(vertical ? gestureState.dy : gestureState.dx);
            },
            onPanResponderRelease: () => {
              const model = modelRef.current;
              if (!model) return;
              model.endSashDrag();
              const state = emitState(model);
              persistState(state);
              setDragging(false);
              onDragEnd?.(state.sizes);
            },
            onPanResponderTerminate: () => {
              const model = modelRef.current;
              if (!model) return;
              model.endSashDrag();
              const state = emitState(model);
              persistState(state);
              setDragging(false);
              onDragEnd?.(state.sizes);
            },
            onStartShouldSetPanResponder: () => true,
          }),
        );
      }, [emitState, onDragEnd, onDragStart, panes.length, persistState, vertical]);

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

              const sashOffset =
                (offsets[index] ?? 0) + (sizes[index] ?? 0) - DEFAULT_SASH_SIZE / 2;
              const sashStyle = vertical
                ? ({
                    top: sashOffset,
                    height: DEFAULT_SASH_SIZE,
                    left: 0,
                    right: 0,
                  } satisfies ViewStyle)
                : ({
                    left: sashOffset,
                    width: DEFAULT_SASH_SIZE,
                    top: 0,
                    bottom: 0,
                  } satisfies ViewStyle);

              return (
                <View
                  key={`${pane.key}-sash`}
                  className={clsx(
                    "split-layout__sash",
                    vertical ? "split-layout__sash--horizontal" : "split-layout__sash--vertical",
                  )}
                  style={[styles.sash, sashStyle]}
                  {...sashPanResponders[index]?.panHandlers}
                />
              );
            })}
          </View>
        </View>
      );
    },
  ),
  { Pane: SplitLayoutPane },
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
});

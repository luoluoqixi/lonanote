import { FloatingOverrideContext, type UseFloatingFn, useFloatingRaw } from "@tamagui/floating";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import { Platform, StatusBar, type View } from "react-native";

/** 与 @tamagui/floating 默认 useFloating 一致的取整 middleware */
const ROUNDED_FLOATING_MIDDLEWARE = {
  name: "rounded",
  fn({ x, y }: { x: number; y: number }) {
    return { x: Math.round(x), y: Math.round(y) };
  },
} as const;

type MeasureCallback = (
  x: number,
  y: number,
  width: number,
  height: number,
  pageX: number,
  pageY: number,
) => void;

/**
 * 与 @floating-ui/react-native `createPlatform` 对 reference 的 Android 修正保持一致。
 * offsetParent 也必须同步，否则 reference.y 含 StatusBar 而 offset 不含 → 锚点浮层整体偏下。
 */
export function adjustFloatingUiAndroidMeasureInWindowY(y: number): number {
  if (Platform.OS === "android" && StatusBar.currentHeight != null && StatusBar.currentHeight > 0) {
    return y + StatusBar.currentHeight;
  }
  return y;
}

/** 供 @floating-ui/react-native 使用的 offsetParent：用 measureInWindow 与 reference 对齐坐标系 */
export function createFloatingMeasureOffsetParent(hostView: View | null) {
  if (hostView == null) {
    return undefined;
  }

  return {
    measure(callback: MeasureCallback) {
      hostView.measureInWindow((x, y, width, height) => {
        const adjustedY = adjustFloatingUiAndroidMeasureInWindowY(y);
        callback(x, adjustedY, width, height, x, adjustedY);
      });
    },
  };
}

const ScreenOverlayTeleportHostNodeContext = createContext<View | null>(null);

export function useScreenOverlayTeleportHostNode(): View | null {
  return useContext(ScreenOverlayTeleportHostNodeContext);
}

/**
 * True Sheet / pageSheet 等 scoped overlay 内 Popover、Menu 的锚点定位：
 * teleport 后浮层坐标需相对 PortalHost，而非整窗 measureInWindow。
 *
 * 注入 FloatingOverrideContext 的 hook；必须调用 useFloatingRaw，勿用包内 useFloating（会再读 context 导致栈溢出）。
 */
export const useScreenOverlayFloating: UseFloatingFn = (options) => {
  const hostNode = useScreenOverlayTeleportHostNode();
  const offsetParent = useMemo(() => createFloatingMeasureOffsetParent(hostNode), [hostNode]);

  return useFloatingRaw({
    ...options,
    middleware: [...(options?.middleware ?? []), ROUNDED_FLOATING_MIDDLEWARE],
    elements: {
      ...options?.elements,
      offsetParent:
        offsetParent ?? (options?.elements as { offsetParent?: unknown } | undefined)?.offsetParent,
    } as NonNullable<Parameters<typeof useFloatingRaw>[0]>["elements"],
  });
};

export function ScreenOverlayFloatingProvider({
  children,
  teleportHostNode,
}: {
  children: ReactNode;
  teleportHostNode: View | null;
}) {
  return (
    <ScreenOverlayTeleportHostNodeContext.Provider value={teleportHostNode}>
      <FloatingOverrideContext.Provider value={useScreenOverlayFloating}>
        {children}
      </FloatingOverrideContext.Provider>
    </ScreenOverlayTeleportHostNodeContext.Provider>
  );
}

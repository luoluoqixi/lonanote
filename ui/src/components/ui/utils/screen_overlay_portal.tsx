import { PortalRootHostProvider } from "@tamagui/portal";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { Dimensions, type LayoutChangeEvent, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PortalHost as TeleportPortalHost } from "react-native-teleport";

import { iosMajorVersion, os } from "@/api/common/platform";
import {
  useTrueSheetOverlayDetent,
  useTrueSheetOverlaySheetTopPosition,
} from "@/components/ui/true_sheet/overlay_layout_context";

import { Toaster } from "../provider/toaster";
import {
  TRUE_SHEET_TOAST_DETENT_LIFT,
  getTrueSheetOverlayLayoutBottomInset,
  shouldApplyIosTrueSheetToastLayerInset,
} from "./overlay_toast_layout";
import { ScreenOverlayFloatingProvider } from "./screen_overlay_floating";

const ScreenOverlayPortalContext = createContext<string | null>(null);
const ScreenOverlayModalLockContext = createContext(0);

type ScreenOverlayModalLockApi = {
  acquire: () => void;
  release: () => void;
};

const ScreenOverlayModalLockApiContext = createContext<ScreenOverlayModalLockApi | null>(null);

export type ScreenOverlayPortalLayout = "wrap" | "scroll-sibling";

/**
 * 在独立原生层（iOS pageSheet VC、Android True Sheet 等）内挂载 overlay Portal。
 * Tamagui modal 默认 teleport 到 app root 会落在 sheet 下面；此处用 react-native-teleport 抬到当前层之上。
 *
 * - `wrap`：子内容与 teleport 层包在同一 flex 容器（默认）。
 * - `scroll-sibling`：子内容（通常为 ScrollView）与 teleport 层并列，避免 TrueSheet 无法钉住滚动视图（iOS 嵌套 Sheet）。
 */
export function ScreenOverlayPortalProvider({
  children,
  hostName,
  overlayLayout = "wrap",
}: {
  children: ReactNode;
  hostName: string;
  overlayLayout?: ScreenOverlayPortalLayout;
}) {
  const [modalLockCount, setModalLockCount] = useState(0);
  const [teleportHostNode, setTeleportHostNode] = useState<View | null>(null);
  const handleTeleportHostNode = useCallback((node: View | null) => {
    setTeleportHostNode(node);
  }, []);

  const lockApi = useMemo<ScreenOverlayModalLockApi>(
    () => ({
      acquire: () => {
        setModalLockCount((count) => count + 1);
      },
      release: () => {
        setModalLockCount((count) => Math.max(0, count - 1));
      },
    }),
    [],
  );

  const portalHost = (
    <ScreenOverlayPortalHost hostName={hostName} onTeleportHostNode={handleTeleportHostNode} />
  );

  const portalBody =
    overlayLayout === "scroll-sibling" ? (
      <>
        {children}
        {portalHost}
      </>
    ) : (
      <View style={styles.root}>
        {children}
        {portalHost}
      </View>
    );

  return (
    <ScreenOverlayPortalContext.Provider value={hostName}>
      <ScreenOverlayModalLockApiContext.Provider value={lockApi}>
        <ScreenOverlayModalLockContext.Provider value={modalLockCount}>
          <ScreenOverlayFloatingProvider teleportHostNode={teleportHostNode}>
            <PortalRootHostProvider hostName={hostName}>{portalBody}</PortalRootHostProvider>
          </ScreenOverlayFloatingProvider>
        </ScreenOverlayModalLockContext.Provider>
      </ScreenOverlayModalLockApiContext.Provider>
    </ScreenOverlayPortalContext.Provider>
  );
}

function OverlayToastLayer({
  hostName,
  hostStackHeight,
}: {
  hostName: string;
  hostStackHeight: number;
}) {
  const insets = useSafeAreaInsets();
  const detent = useTrueSheetOverlayDetent();
  const sheetTopPosition = useTrueSheetOverlaySheetTopPosition();

  // iOS 安全区底部补偿
  const bottomInset = shouldApplyIosTrueSheetToastLayerInset(hostName)
    ? getTrueSheetOverlayLayoutBottomInset(hostName, insets.bottom, detent)
    : 0;

  // 局部 detent：hostStack 被 ScrollView 撑到完整内容高度，
  // 而 Sheet 只显示顶部一部分。
  // 用 sheetTopPosition 获取 Sheet 当前实际可视高度，
  // 直接相减得到被隐藏的底部偏移量，再加固定 lift 补偿参考点偏差。
  // iOS 15 不支持自定义 detent（只有 medium/large），跳过此计算避免位置偏上。
  const isIOS15 = os() === "ios" && iosMajorVersion() === 15;
  const canPartialDetent = !isIOS15;
  const screenHeight = Dimensions.get("window").height;
  const detentVisibleOffset =
    hostName != null &&
    canPartialDetent &&
    detent < 1 &&
    sheetTopPosition != null &&
    hostStackHeight > 0
      ? Math.max(
          0,
          Math.round(
            hostStackHeight - (screenHeight - sheetTopPosition) + TRUE_SHEET_TOAST_DETENT_LIFT,
          ),
        )
      : 0;

  const bottom = Math.max(bottomInset, detentVisibleOffset);
  const layerStyle: ViewStyle[] | ViewStyle =
    bottom > 0 ? [styles.toastLayer, { bottom }] : styles.toastLayer;

  return (
    <View pointerEvents="box-none" style={layerStyle}>
      <Toaster viewportName={hostName} />
    </View>
  );
}

function OverlayTeleportLayer({
  hostName,
  onTeleportHostNode,
}: {
  hostName: string;
  onTeleportHostNode: (node: View | null) => void;
}) {
  const handleHostRef = useCallback(
    (node: View | null) => {
      onTeleportHostNode(node);
    },
    [onTeleportHostNode],
  );

  return (
    <View collapsable={false} style={styles.teleportLayer}>
      <View
        ref={handleHostRef}
        collapsable={false}
        pointerEvents="box-none"
        style={styles.teleportHost}
      >
        <TeleportPortalHost name={hostName} style={styles.teleportHostFill} />
      </View>
    </View>
  );
}

export function ScreenOverlayPortalHost({
  hostName,
  onTeleportHostNode,
}: {
  hostName: string;
  onTeleportHostNode: (node: View | null) => void;
}) {
  const [hostStackHeight, setHostStackHeight] = useState(0);
  const handleHostStackLayout = useCallback((event: LayoutChangeEvent) => {
    setHostStackHeight(event.nativeEvent.layout.height);
  }, []);

  return (
    <View pointerEvents="box-none" style={styles.hostStack} onLayout={handleHostStackLayout}>
      <OverlayToastLayer hostName={hostName} hostStackHeight={hostStackHeight} />
      <OverlayTeleportLayer hostName={hostName} onTeleportHostNode={onTeleportHostNode} />
    </View>
  );
}

export function useScreenOverlayPortalHost(): string | null {
  return useContext(ScreenOverlayPortalContext);
}

/** 在 ScreenOverlayPortalProvider 子树内时返回 host，供 Toast / modal Sheet 等使用（不限 iOS）。 */
export function useScopedOverlayPortalHostName(): string | undefined {
  const host = useScreenOverlayPortalHost();
  return host ?? undefined;
}

/** overlay 子树内 Tamagui modal Sheet 打开时为 true，用于冻结底层 ScrollView（如 iOS pageSheet）。 */
export function useScreenOverlayModalLockActive(): boolean {
  const modalLockCount = useContext(ScreenOverlayModalLockContext);
  const host = useScreenOverlayPortalHost();
  return host != null && modalLockCount > 0 && os() === "ios";
}

export function useScreenOverlayModalLockApi(): ScreenOverlayModalLockApi | null {
  return useContext(ScreenOverlayModalLockApiContext);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 1,
    position: "relative",
  },
  hostStack: {
    bottom: 0,
    left: 0,
    pointerEvents: "box-none",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1_000_000,
  },
  toastLayer: {
    bottom: 0,
    left: 0,
    pointerEvents: "box-none",
    position: "absolute",
    right: 0,
    zIndex: 1,
  },
  teleportLayer: {
    bottom: 0,
    left: 0,
    pointerEvents: "box-none",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  teleportHost: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  teleportHostFill: {
    flex: 1,
  },
});

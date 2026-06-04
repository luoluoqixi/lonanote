import { PortalRootHostProvider } from "@tamagui/portal";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PortalHost as TeleportPortalHost } from "react-native-teleport";

import { os } from "@/api/common/platform";

import { Toaster } from "../provider/toaster";
import {
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

function OverlayToastLayer({ hostName }: { hostName: string }) {
  const insets = useSafeAreaInsets();
  const bottomInset = shouldApplyIosTrueSheetToastLayerInset(hostName)
    ? getTrueSheetOverlayLayoutBottomInset(hostName, insets.bottom)
    : 0;
  const layerStyle: ViewStyle[] | ViewStyle =
    bottomInset > 0 ? [styles.toastLayer, { bottom: bottomInset }] : styles.toastLayer;

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
  return (
    <View pointerEvents="box-none" style={styles.hostStack}>
      <OverlayToastLayer hostName={hostName} />
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

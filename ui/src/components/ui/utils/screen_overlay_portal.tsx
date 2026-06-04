import { PortalRootHostProvider } from "@tamagui/portal";
import { type ReactNode, createContext, useContext, useMemo, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { PortalHost as TeleportPortalHost } from "react-native-teleport";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { os } from "@/api/common/platform";

import { Toaster } from "../provider/toaster";

const ScreenOverlayPortalContext = createContext<string | null>(null);
const ScreenOverlayModalLockContext = createContext(0);

type ScreenOverlayModalLockApi = {
  acquire: () => void;
  release: () => void;
};

const ScreenOverlayModalLockApiContext = createContext<ScreenOverlayModalLockApi | null>(null);

/**
 * 在独立原生层（iOS pageSheet VC、Android True Sheet 等）内挂载 overlay Portal。
 * Tamagui modal 默认 teleport 到 app root 会落在 sheet 下面；此处用 react-native-teleport 抬到当前层之上。
 */
export function ScreenOverlayPortalProvider({
  children,
  hostName,
}: {
  children: ReactNode;
  hostName: string;
}) {
  const [modalLockCount, setModalLockCount] = useState(0);

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

  return (
    <ScreenOverlayPortalContext.Provider value={hostName}>
      <ScreenOverlayModalLockApiContext.Provider value={lockApi}>
        <ScreenOverlayModalLockContext.Provider value={modalLockCount}>
          <PortalRootHostProvider hostName={hostName}>
            <View style={styles.root}>
              {children}
              <ScreenOverlayPortalHost hostName={hostName} />
            </View>
          </PortalRootHostProvider>
        </ScreenOverlayModalLockContext.Provider>
      </ScreenOverlayModalLockApiContext.Provider>
    </ScreenOverlayPortalContext.Provider>
  );
}

function OverlayToastLayer({ hostName }: { hostName: string }) {
  const insets = useSafeAreaInsets();
  // iOS True Sheet / pageSheet：`insetAdjustment="automatic"` 会把底部 safe area 叠进 sheet 总高度，
  // toastLayer 贴布局底会偏到可视区外；仅上移 insets.bottom。与 Home 条的间距在 Toaster Viewport 上调整。
  const layerStyle: ViewStyle[] | ViewStyle =
    os() === "ios" ? [styles.toastLayer, { bottom: insets.bottom }] : styles.toastLayer;

  return (
    <View pointerEvents="box-none" style={layerStyle}>
      <Toaster viewportName={hostName} />
    </View>
  );
}

export function ScreenOverlayPortalHost({ hostName }: { hostName: string }) {
  return (
    <View pointerEvents="box-none" style={styles.hostStack}>
      <OverlayToastLayer hostName={hostName} />
      {/* 无浮层时须完全不接手势，否则会挡住 True Sheet / ScrollView 滚动 */}
      <View pointerEvents="none" style={styles.teleportLayer}>
        <TeleportPortalHost name={hostName} style={styles.teleportHost} />
      </View>
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
    pointerEvents: "none",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  teleportHost: {
    flex: 1,
    pointerEvents: "none",
  },
});

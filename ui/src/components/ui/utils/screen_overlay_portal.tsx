import { PortalRootHostProvider } from "@tamagui/portal";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { PortalHost as TeleportPortalHost } from "react-native-teleport";

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
 * 在 iOS pageSheet 独立 VC 内挂载 overlay Portal（Tamagui modal 默认 teleport 到 root 会落在 sheet 下面）。
 * 使用 react-native-teleport 的 PortalHost；仅 debug pageSheet 等场景在 iOS 上启用，Android 保持 Tamagui 默认 root。
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

export function ScreenOverlayPortalHost({ hostName }: { hostName: string }) {
  return (
    <View pointerEvents="box-none" style={styles.host}>
      <TeleportPortalHost name={hostName} style={StyleSheet.absoluteFillObject} />
      <Toaster viewportName={hostName} />
    </View>
  );
}

export function useScreenOverlayPortalHost(): string | null {
  return useContext(ScreenOverlayPortalContext);
}

/** iOS pageSheet 内 Tamagui modal Sheet 打开时为 true，用于冻结底层页面 ScrollView。 */
export function useScreenOverlayModalLockActive(): boolean {
  const modalLockCount = useContext(ScreenOverlayModalLockContext);
  return os() === "ios" && modalLockCount > 0;
}

export function useScreenOverlayModalLockApi(): ScreenOverlayModalLockApi | null {
  return useContext(ScreenOverlayModalLockApiContext);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1_000_000,
  },
});

import { NativePortal, getPortal } from "@tamagui/native";
import { PortalItem, resolveViewZIndex } from "@tamagui/portal";
import type { PortalProps } from "@tamagui/portal";
import { useStackedZIndex } from "@tamagui/z-index-stack";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";

const IOS_MODAL_PORTAL_CLOSE_DELAY_MS = 320;

export type SheetPortalProps = PortalProps & {
  active?: boolean;
  children?: ReactNode;
  /** 默认 `root`；pageSheet 内应传入 `ScreenOverlayPortalProvider` 的 hostName。 */
  hostName?: string;
  /** Android Modal onRequestClose 回调，用于处理硬件返回键 */
  onRequestClose?: () => void;
};

/**
 * Tamagui `Portal` 在 native 上写死 `hostName="root"`。
 * 非 root overlay host（iOS pageSheet、Android True Sheet 等）走透明 Modal，
 * 避免 teleport 落点高度为 0 或手势被外层 sheet 吞掉。
 */
export function SheetPortal(props: SheetPortalProps) {
  const {
    active = true,
    children,
    hostName = "root",
    onRequestClose,
    passThrough,
    stackZIndex,
    zIndex,
  } = props;
  const stackedZIndex = useStackedZIndex({
    stackZIndex,
    zIndex: resolveViewZIndex(zIndex),
  });

  const contents = (
    <View pointerEvents="box-none" style={[styles.portalLayer, { zIndex: stackedZIndex }]}>
      {children}
    </View>
  );

  const useScopedOverlayHost = hostName !== "root";
  const useScopedModalHost = useScopedOverlayHost;
  const [scopedModalVisible, setScopedModalVisible] = useState(active);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!useScopedModalHost) {
      return;
    }

    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (active) {
      setScopedModalVisible(true);
      return;
    }

    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setScopedModalVisible(false);
    }, IOS_MODAL_PORTAL_CLOSE_DELAY_MS);

    return () => {
      if (closeTimerRef.current != null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [active, useScopedModalHost]);

  if (useScopedModalHost) {
    if (!scopedModalVisible) {
      return null;
    }

    return (
      <Modal
        animationType="none"
        onRequestClose={onRequestClose}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible
      >
        <View style={styles.modalRoot}>{contents}</View>
      </Modal>
    );
  }

  const portalState = getPortal().state;
  if (portalState.type === "teleport") {
    return <NativePortal hostName="root">{contents}</NativePortal>;
  }

  return (
    <PortalItem hostName={hostName} passThrough={passThrough}>
      {contents}
    </PortalItem>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFill,
  },
  portalLayer: {
    ...StyleSheet.absoluteFill,
  },
});

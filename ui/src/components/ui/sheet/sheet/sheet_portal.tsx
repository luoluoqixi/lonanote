import { getPortal, NativePortal } from "@tamagui/native";
import { PortalItem, resolveViewZIndex } from "@tamagui/portal";
import type { PortalProps } from "@tamagui/portal";
import { useStackedZIndex } from "@tamagui/z-index-stack";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Portal as TeleportPortal } from "react-native-teleport";

import { os } from "@/api/common/platform";

const IOS_MODAL_PORTAL_CLOSE_DELAY_MS = 320;

export type SheetPortalProps = PortalProps & {
  active?: boolean;
  children?: ReactNode;
  /** 默认 `root`；pageSheet 内应传入 `ScreenOverlayPortalProvider` 的 hostName。 */
  hostName?: string;
};

/**
 * Tamagui `Portal` 在 native 上写死 `hostName="root"`。
 * iOS pageSheet 内的非 root host 改走按需挂载的透明 Modal，避免内层 Sheet 的
 * 拖拽/弹性滚动继续被 UIKit pageSheet 手势识别器消费；其余情况保留 teleport。
 */
export function SheetPortal(props: SheetPortalProps) {
  const { active = true, children, hostName = "root", passThrough, stackZIndex, zIndex } = props;
  const stackedZIndex = useStackedZIndex({
    stackZIndex,
    zIndex: resolveViewZIndex(zIndex),
  });
  const teleportPortalName = useId();

  const contents = (
    <View pointerEvents="box-none" style={[styles.portalLayer, { zIndex: stackedZIndex }]}>
      {children}
    </View>
  );

  const portalState = getPortal().state;
  const useIosModalHost = hostName !== "root" && os() === "ios";
  const useDedicatedTeleportHost = hostName !== "root" && portalState.type === "teleport";
  const [iosModalVisible, setIosModalVisible] = useState(active);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!useIosModalHost) {
      return;
    }

    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (active) {
      setIosModalVisible(true);
      return;
    }

    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setIosModalVisible(false);
    }, IOS_MODAL_PORTAL_CLOSE_DELAY_MS);

    return () => {
      if (closeTimerRef.current != null) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [active, useIosModalHost]);

  if (useIosModalHost) {
    if (!iosModalVisible) {
      return null;
    }

    return (
      <Modal
        animationType="none"
        onRequestClose={() => {}}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible
      >
        <View style={styles.modalRoot}>{contents}</View>
      </Modal>
    );
  }

  if (useDedicatedTeleportHost) {
    return (
      <TeleportPortal hostName={hostName} name={teleportPortalName}>
        {contents}
      </TeleportPortal>
    );
  }

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
    ...StyleSheet.absoluteFillObject,
  },
  portalLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});

import { useLayoutEffect } from "react";

import { os } from "@/api/common/platform";
import {
  useScreenOverlayModalLockApi,
  useScreenOverlayPortalHost,
} from "@/components/ui/utils/screen_overlay_portal";
import {
  acquirePageSheetGestureLock,
  releasePageSheetGestureLock,
} from "@/components/ui/utils/page_sheet_gesture_lock";

/**
 * 在 iOS pageSheet overlay 内打开 Tamagui modal Sheet 时登记锁计数。
 * 承载 pageSheet 的父级路由会直接订阅这个锁，避免内层 ScrollView/关闭动画手势穿透到 pageSheet。
 */
export function useLockPageSheetDismiss(active: boolean) {
  const screenOverlayPortalHost = useScreenOverlayPortalHost();
  const modalLockApi = useScreenOverlayModalLockApi();

  useLayoutEffect(() => {
    if (!active || os() !== "ios" || screenOverlayPortalHost == null) {
      return;
    }

    modalLockApi?.acquire();
    acquirePageSheetGestureLock();

    return () => {
      releasePageSheetGestureLock();
      modalLockApi?.release();
    };
  }, [active, modalLockApi, screenOverlayPortalHost]);
}

import { useLayoutEffect } from "react";

import { os } from "@/api/common/platform";
import {
  acquirePageSheetGestureLock,
  releasePageSheetGestureLock,
} from "@/components/ui/utils/page_sheet_gesture_lock";
import {
  useScreenOverlayModalLockApi,
  useScreenOverlayPortalHost,
} from "@/components/ui/utils/screen_overlay_portal";

/**
 * 在 iOS pageSheet overlay 内打开 Tamagui modal Sheet 时登记锁计数。
 * 承载 pageSheet 的父级路由会直接订阅这个锁，避免内层 ScrollView/关闭动画手势穿透到 pageSheet。
 */
export function useLockPageSheetDismiss(active: boolean) {
  const screenOverlayPortalHost = useScreenOverlayPortalHost();
  const modalLockApi = useScreenOverlayModalLockApi();

  useLayoutEffect(() => {
    if (!active || screenOverlayPortalHost == null) {
      return;
    }

    // pageSheet 手势锁仅 iOS Native Stack 使用；Android True Sheet 只登记 modal 锁计数。
    if (os() === "ios") {
      acquirePageSheetGestureLock();
    }

    modalLockApi?.acquire();

    return () => {
      if (os() === "ios") {
        releasePageSheetGestureLock();
      }
      modalLockApi?.release();
    };
  }, [active, modalLockApi, screenOverlayPortalHost]);
}

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isWeb } from "@/api/common/platform";

import {
  getTrueSheetCenteredModalLiftAmount,
  isTrueSheetOverlayPortalHost,
} from "./overlay_toast_layout";
import { useScreenOverlayPortalHost } from "./screen_overlay_portal";

/**
 * True Sheet 内居中 Dialog / AlertDialog：上移内容，不缩短 teleport 层（避免遮罩底部漏光）。
 * 视觉位移约 liftAmount / 2。
 */
export function getTrueSheetCenteredModalContentOffsetY(
  hostName: string,
  safeAreaBottom: number,
): number {
  return -Math.round(getTrueSheetCenteredModalLiftAmount(hostName, safeAreaBottom) / 2);
}

export function useTrueSheetCenteredModalContentOffsetY(): number {
  const host = useScreenOverlayPortalHost();
  const insets = useSafeAreaInsets();

  if (isWeb() || host == null || !isTrueSheetOverlayPortalHost(host)) {
    return 0;
  }

  return getTrueSheetCenteredModalContentOffsetY(host, insets.bottom);
}

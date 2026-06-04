import { useEffect } from "react";
import { BackHandler } from "react-native";

import { os } from "@/api/common/platform";

export type UseAndroidSheetBackHandlerOptions = {
  /** 为 false 时不拦截硬件返回（例如 Sheet 未展示时）。 */
  enabled: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
};

/** Sheet 展示且为 Android 时：子页 `onBack`，根页 `onClose`。 */
export function useAndroidSheetBackHandler({
  enabled,
  canGoBack,
  onBack,
  onClose,
}: UseAndroidSheetBackHandlerOptions) {
  useEffect(() => {
    if (os() !== "android" || !enabled) {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack) {
        onBack();
        return true;
      }

      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [canGoBack, enabled, onBack, onClose]);
}

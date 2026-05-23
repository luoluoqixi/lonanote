import { ToastProvider } from "@heroui/react";

import { DEFAULT_TOAST_CONFIG } from "./config";
import type { UIProviderProps } from "./types";

export function UIProvider({ children, toastConfig }: UIProviderProps) {
  const { maxVisibleToasts, webGap, webPlacement, webScaleFactor, webWidth } =
    toastConfig || DEFAULT_TOAST_CONFIG;

  return (
    <>
      {children}
      <ToastProvider
        maxVisibleToasts={maxVisibleToasts}
        gap={webGap}
        placement={webPlacement}
        scaleFactor={webScaleFactor}
        width={webWidth}
      />
    </>
  );
}

import { Portal } from "@tamagui/portal";
import type { PortalProps } from "@tamagui/portal";
import type { ReactNode } from "react";

import { isWeb } from "@/api/common/platform";

import { SheetPortal } from "../sheet/simple_sheet/sheet/sheet_portal";
import { useScopedOverlayPortalHostName } from "./screen_overlay_portal";

export type OverlayScopedPortalProps = PortalProps & {
  active?: boolean;
  children?: ReactNode;
};

/**
 * 在 ScreenOverlayPortalProvider 子树内替代 Tamagui Portal / Dialog.Portal 的 root 硬编码。
 * Toast 走 Toaster viewport；Dialog / Menu 等须显式使用本组件。
 */
export function OverlayScopedPortal({
  active = true,
  children,
  passThrough,
  stackZIndex,
  zIndex,
  ...rest
}: OverlayScopedPortalProps) {
  const host = useScopedOverlayPortalHostName();

  if (host == null || isWeb()) {
    return (
      <Portal passThrough={passThrough} stackZIndex={stackZIndex} zIndex={zIndex} {...rest}>
        {children}
      </Portal>
    );
  }

  return (
    <SheetPortal
      active={active}
      hostName={host}
      passThrough={passThrough}
      stackZIndex={stackZIndex}
      zIndex={zIndex}
      {...rest}
    >
      {children}
    </SheetPortal>
  );
}

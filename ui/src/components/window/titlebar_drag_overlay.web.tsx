import { type CSSProperties, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { isDesktop, os } from "@/api/common";
import { TITLE_HEIGHT } from "@/config";

const TITLEBAR_DRAG_OVERLAY_Z_INDEX = 2147483647;
const WINDOWS_CONTROL_AREA_WIDTH = 46 * 3;

type DragOverlayStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
  appRegion?: "drag" | "no-drag";
};

const dragOverlayStyle: DragOverlayStyle = {
  WebkitAppRegion: "drag",
  appRegion: "drag",
  backgroundColor: "transparent",
  left: 0,
  pointerEvents: "auto",
  position: "fixed",
  right: 0,
  top: 0,
  userSelect: "none",
  zIndex: TITLEBAR_DRAG_OVERLAY_Z_INDEX,
};

function TitleBarDragOverlay() {
  const [mounted, setMounted] = useState(false);
  const desktop = isDesktop();
  const platform = os();
  const reservedRight =
    platform === "windows" || platform === "linux" ? WINDOWS_CONTROL_AREA_WIDTH : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!desktop || !mounted) {
    return null;
  }

  return createPortal(
    <div
      aria-hidden="true"
      data-tauri-drag-region=""
      style={{ ...dragOverlayStyle, height: TITLE_HEIGHT, right: reservedRight }}
    />,
    document.body,
  );
}

export { TitleBarDragOverlay };

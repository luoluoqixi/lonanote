import { type CSSProperties, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { isDesktop, os } from "@/api/common";
import { TITLE_HEIGHT } from "@/config";

const TITLEBAR_DRAG_OVERLAY_Z_INDEX = 2147483647;

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
  const isMac = os() === "macos";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!desktop || !isMac || !mounted) {
    return null;
  }

  return createPortal(
    <div data-tauri-drag-region="" style={{ ...dragOverlayStyle, height: TITLE_HEIGHT }} />,
    document.body,
  );
}

export { TitleBarDragOverlay };

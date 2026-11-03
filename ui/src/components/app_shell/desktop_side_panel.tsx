import { type ReactNode, useState } from "react";

import { DesktopSidePanelSurface } from "./desktop_side_panel_surface";

/** 面板首次访问才加载，之后在桌面壳存续期间保留各自的页面状态。 */
export function DesktopSidePanel({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active);
  if (active && !visited) setVisited(true);
  if (!active && !visited) return null;
  return <DesktopSidePanelSurface active={active}>{children}</DesktopSidePanelSurface>;
}

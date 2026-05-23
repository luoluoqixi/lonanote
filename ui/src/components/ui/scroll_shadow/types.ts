import type { ScrollShadowVisibility } from "heroui-native";
import type { ReactNode } from "react";

export interface ScrollShadowProps {
  children?: ReactNode;
  className?: string;
  hideScrollBar?: boolean;
  isEnabled?: boolean;
  offset?: number;
  onVisibilityChange?: (visibility: ScrollShadowVisibility) => void;
  orientation?: "horizontal" | "vertical";
  variant?: "fade";
  size?: number;
  visibility?: ScrollShadowVisibility;
}

export type { ScrollShadowVisibility };

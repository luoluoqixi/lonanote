import type { ScrollShadowRootProps as WebScrollShadowRootProps } from "@heroui/react";
import type {
  ScrollShadowProps as NativeScrollShadowProps,
  ScrollShadowVisibility,
} from "heroui-native";
import type { ReactNode } from "react";

type ScrollShadowPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface ScrollShadowProps extends ScrollShadowPlatformProps<
  WebScrollShadowRootProps,
  NativeScrollShadowProps
> {
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

import type { PressEvent } from "@heroui/react";
import type { HTMLAttributeAnchorTarget, ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";

export interface LinkProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  href?: string;
  isDisabled?: boolean;
  onPress?: (e: PressEvent | GestureResponderEvent) => void | Promise<void>;
  rel?: string;
  target?: HTMLAttributeAnchorTarget;
}

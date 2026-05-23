import type { HTMLAttributeAnchorTarget, ReactNode } from "react";

import type { ButtonProps } from "../button";

export interface LinkProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  href?: string;
  isDisabled?: boolean;
  onPress?: ButtonProps["onPress"];
  rel?: string;
  target?: HTMLAttributeAnchorTarget;
}

import type { ReactNode } from "react";

import type { AppButtonSize, AppButtonVariant } from "../button/types";

export interface IconButtonProps {
  accessibilityLabel: string;
  children: ReactNode;
  className?: string;
  isDisabled?: boolean;
  onPress?: () => void | Promise<void>;
  size?: AppButtonSize;
  variant?: AppButtonVariant;
}

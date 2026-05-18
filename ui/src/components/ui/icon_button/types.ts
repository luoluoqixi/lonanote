import type { ReactNode } from "react";

import type { ButtonSize, ButtonVariant } from "../button/types";

export interface IconButtonProps {
  accessibilityLabel: string;
  children: ReactNode;
  className?: string;
  isDisabled?: boolean;
  onPress?: () => void | Promise<void>;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

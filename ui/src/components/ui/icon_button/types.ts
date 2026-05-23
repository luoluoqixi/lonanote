import type { ReactNode } from "react";

import type { ButtonProps, ButtonSize, ButtonVariant } from "../button/types";

type IconButtonPlatformProps = Pick<ButtonProps, "nativeProps" | "webProps">;

export interface IconButtonProps extends IconButtonPlatformProps {
  accessibilityLabel: string;
  children: ReactNode;
  className?: string;
  isDisabled?: boolean;
  onPress?: () => void | Promise<void>;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

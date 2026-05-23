import type { ButtonProps } from "../button";

export interface CloseButtonIconProps {
  color?: string;
  size?: number;
}

export interface CloseButtonProps {
  accessibilityLabel?: string;
  className?: string;
  iconProps?: CloseButtonIconProps;
  isDisabled?: boolean;
  onPress?: ButtonProps["onPress"];
}

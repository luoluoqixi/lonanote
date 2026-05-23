import type { ButtonProps } from "../button";

export interface ToggleButtonProps extends ButtonProps {
  defaultSelected?: boolean;
  isSelected?: boolean;
  onValueChange?: (nextValue: boolean) => void;
}

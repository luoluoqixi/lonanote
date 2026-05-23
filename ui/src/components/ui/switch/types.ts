export interface SwitchProps {
  accessibilityLabel?: string;
  className?: string;
  isDisabled?: boolean;
  onValueChange?: (nextValue: boolean) => void;
  value: boolean;
}

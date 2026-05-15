export interface SelectOption<T extends string = string> {
  description?: string;
  isDisabled?: boolean;
  label: string;
  startContent?: React.ReactNode;
  value: T;
}

export interface SelectProps<T extends string = string> {
  accessibilityLabel?: string;
  className?: string;
  contentClassName?: string;
  isDisabled?: boolean;
  onValueChange?: (nextValue: T) => void;
  options: SelectOption<T>[];
  placeholder: string;
  value?: T;
}

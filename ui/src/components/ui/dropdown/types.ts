import type { ReactNode } from "react";

export interface DropdownItemData {
  className?: string;
  isDisabled?: boolean;
  key: string;
  label: ReactNode;
}

export interface DropdownProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  isDefaultOpen?: boolean;
  isDisabled?: boolean;
  isOpen?: boolean;
  itemClassName?: string;
  items?: DropdownItemData[];
  onAction?: (key: string) => void;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  triggerClassName?: string;
}

export interface DropdownTriggerProps {
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
}

export interface DropdownPopoverProps {
  children?: ReactNode;
  className?: string;
}

export interface DropdownMenuProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
}

export interface DropdownSectionProps {
  children?: ReactNode;
  className?: string;
}

export interface DropdownItemProps {
  children?: ReactNode;
  className?: string;
  isDisabled?: boolean;
  onPress?: () => void;
}

export interface DropdownItemIndicatorProps {
  className?: string;
}

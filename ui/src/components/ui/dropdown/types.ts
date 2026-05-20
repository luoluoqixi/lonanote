import type { ReactNode } from "react";

export interface DropdownProps {
  children?: ReactNode;
  className?: string;
  isDefaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
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
}

export interface DropdownItemIndicatorProps {
  className?: string;
}

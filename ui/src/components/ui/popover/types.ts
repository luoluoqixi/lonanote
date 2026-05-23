import type { ReactNode } from "react";

export interface PopoverProps {
  children?: ReactNode;
  isDefaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export interface PopoverTriggerProps {
  children?: ReactNode;
  className?: string;
}

export interface PopoverContentProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
}

export interface PopoverArrowProps {
  children?: ReactNode;
  className?: string;
}

export interface PopoverTitleProps {
  children?: ReactNode;
  className?: string;
}

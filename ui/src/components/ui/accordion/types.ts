import type { AccordionVariant } from "heroui-native";
import type { ReactNode } from "react";

export interface AccordionEntry {
  content: ReactNode;
  contentClassName?: string;
  indicatorClassName?: string;
  itemClassName?: string;
  key: string;
  title: ReactNode;
  triggerClassName?: string;
}

export interface AccordionProps {
  accessibilityLabel?: string;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  hideSeparator?: boolean;
  indicatorClassName?: string;
  itemClassName?: string;
  items?: AccordionEntry[];
  triggerClassName?: string;
  variant?: AccordionVariant;
}

export interface AccordionItemProps {
  children?: ReactNode;
  className?: string;
  value: string;
}

export interface AccordionTriggerProps {
  children?: ReactNode;
  className?: string;
}

export interface AccordionIndicatorProps {
  children?: ReactNode;
  className?: string;
}

export interface AccordionContentProps {
  children?: ReactNode;
  className?: string;
}

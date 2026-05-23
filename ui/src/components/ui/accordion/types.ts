import type {
  AccordionIndicatorProps as WebAccordionIndicatorProps,
  AccordionItemProps as WebAccordionItemProps,
  AccordionPanelProps as WebAccordionPanelProps,
  AccordionRootProps as WebAccordionRootProps,
  AccordionTriggerProps as WebAccordionTriggerProps,
} from "@heroui/react";
import type {
  AccordionVariant,
  AccordionContentProps as NativeAccordionContentProps,
  AccordionIndicatorProps as NativeAccordionIndicatorProps,
  AccordionItemProps as NativeAccordionItemProps,
  AccordionRootProps as NativeAccordionRootProps,
  AccordionTriggerProps as NativeAccordionTriggerProps,
} from "heroui-native";
import type { ReactNode } from "react";

type AccordionPlatformProps<TWeb, TNative> = {
  nativeProps?: Omit<TNative, "children" | "className">;
  webProps?: Omit<TWeb, "children" | "className">;
};

export interface AccordionEntry {
  content: ReactNode;
  contentClassName?: string;
  indicatorClassName?: string;
  itemClassName?: string;
  key: string;
  title: ReactNode;
  triggerClassName?: string;
}

export interface AccordionProps extends AccordionPlatformProps<
  WebAccordionRootProps,
  NativeAccordionRootProps
> {
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

export interface AccordionItemProps extends AccordionPlatformProps<
  WebAccordionItemProps,
  NativeAccordionItemProps
> {
  children?: ReactNode;
  className?: string;
}

export interface AccordionTriggerProps extends AccordionPlatformProps<
  WebAccordionTriggerProps,
  NativeAccordionTriggerProps
> {
  children?: ReactNode;
  className?: string;
}

export interface AccordionIndicatorProps extends AccordionPlatformProps<
  WebAccordionIndicatorProps,
  NativeAccordionIndicatorProps
> {
  children?: ReactNode;
  className?: string;
}

export interface AccordionContentProps extends AccordionPlatformProps<
  WebAccordionPanelProps,
  NativeAccordionContentProps
> {
  children?: ReactNode;
  className?: string;
}

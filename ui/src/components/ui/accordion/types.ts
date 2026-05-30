import type { ComponentProps, ReactNode } from "react";
import type { Accordion as TamaguiAccordion } from "tamagui";

import type { NativeHapticsSetting } from "../utils";

export interface AccordionItemData {
  "aria-label"?: string;
  content: ReactNode;
  disabled?: boolean;
  title: ReactNode;
  value: string;
}

type AccordionRootProps = Omit<ComponentProps<typeof TamaguiAccordion>, "children" | "items">;

export type AccordionProps = AccordionRootProps & {
  children?: ReactNode;
  collapsible?: boolean;
  contentProps?: AccordionContentProps;
  headerProps?: AccordionHeaderProps;
  itemProps?: Omit<AccordionItemProps, "value">;
  items?: AccordionItemData[];
  nativeHaptics?: NativeHapticsSetting;
  triggerProps?: AccordionTriggerProps;
};
export type AccordionContentProps = ComponentProps<typeof TamaguiAccordion.Content>;
export type AccordionHeightAnimatorProps = ComponentProps<typeof TamaguiAccordion.HeightAnimator>;
export type AccordionHeaderProps = ComponentProps<typeof TamaguiAccordion.Header>;
export type AccordionItemProps = ComponentProps<typeof TamaguiAccordion.Item>;
export type AccordionTriggerProps = ComponentProps<typeof TamaguiAccordion.Trigger>;

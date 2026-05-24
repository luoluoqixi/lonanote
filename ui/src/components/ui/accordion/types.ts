import type { ComponentProps, ReactNode } from "react";
import type { Accordion as TamaguiAccordion } from "tamagui";

export interface AccordionItemData {
  content: ReactNode;
  disabled?: boolean;
  title: ReactNode;
  value: string;
}

type AccordionRootProps = ComponentProps<typeof TamaguiAccordion>;

export type AccordionProps = AccordionRootProps & {
  children?: ReactNode;
  contentProps?: AccordionContentProps;
  headerProps?: AccordionHeaderProps;
  itemProps?: Omit<AccordionItemProps, "value">;
  items?: AccordionItemData[];
  triggerProps?: AccordionTriggerProps;
};
export type AccordionContentProps = ComponentProps<typeof TamaguiAccordion.Content>;
export type AccordionHeaderProps = ComponentProps<typeof TamaguiAccordion.Header>;
export type AccordionItemProps = ComponentProps<typeof TamaguiAccordion.Item>;
export type AccordionTriggerProps = ComponentProps<typeof TamaguiAccordion.Trigger>;

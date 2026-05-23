import clsx from "clsx";
import { Accordion as HeroUIAccordion } from "heroui-native";

import type {
  AccordionContentProps,
  AccordionIndicatorProps,
  AccordionItemProps,
  AccordionProps,
  AccordionTriggerProps,
} from "./types";

function AccordionRoot({
  accessibilityLabel,
  children,
  className,
  contentClassName,
  hideSeparator,
  indicatorClassName,
  itemClassName,
  items,
  triggerClassName,
  variant,
}: AccordionProps) {
  const content =
    children ??
    items?.map((item) => (
      <HeroUIAccordion.Item
        className={clsx(itemClassName, item.itemClassName)}
        key={item.key}
        value={item.key}
      >
        <HeroUIAccordion.Trigger
          className={clsx(
            "flex-row items-center justify-between gap-3",
            triggerClassName,
            item.triggerClassName,
          )}
        >
          {item.title}
          <HeroUIAccordion.Indicator
            className={clsx(indicatorClassName, item.indicatorClassName)}
          />
        </HeroUIAccordion.Trigger>
        <HeroUIAccordion.Content className={clsx(contentClassName, item.contentClassName)}>
          {item.content}
        </HeroUIAccordion.Content>
      </HeroUIAccordion.Item>
    ));

  return (
    <HeroUIAccordion
      accessibilityLabel={accessibilityLabel}
      className={className}
      hideSeparator={hideSeparator}
      variant={variant}
    >
      {content}
    </HeroUIAccordion>
  );
}

function AccordionItem({ children, className, value }: AccordionItemProps) {
  return (
    <HeroUIAccordion.Item className={className} value={value}>
      {children}
    </HeroUIAccordion.Item>
  );
}

function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  return <HeroUIAccordion.Trigger className={className}>{children}</HeroUIAccordion.Trigger>;
}

function AccordionIndicator({ children, className }: AccordionIndicatorProps) {
  return <HeroUIAccordion.Indicator className={className}>{children}</HeroUIAccordion.Indicator>;
}

function AccordionContent({ children, className }: AccordionContentProps) {
  return <HeroUIAccordion.Content className={className}>{children}</HeroUIAccordion.Content>;
}

export const Accordion = Object.assign(AccordionRoot, {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Indicator: AccordionIndicator,
  Content: AccordionContent,
});

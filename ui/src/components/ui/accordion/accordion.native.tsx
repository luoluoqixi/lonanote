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
  nativeProps,
  triggerClassName,
  variant,
  webProps,
}: AccordionProps) {
  void webProps;

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
      {...(nativeProps as any)}
    >
      {content}
    </HeroUIAccordion>
  );
}

function AccordionItem({ children, className, nativeProps, webProps }: AccordionItemProps) {
  void webProps;
  return (
    <HeroUIAccordion.Item className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIAccordion.Item>
  );
}

function AccordionTrigger({ children, className, nativeProps, webProps }: AccordionTriggerProps) {
  void webProps;
  return (
    <HeroUIAccordion.Trigger className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIAccordion.Trigger>
  );
}

function AccordionIndicator({
  children,
  className,
  nativeProps,
  webProps,
}: AccordionIndicatorProps) {
  void webProps;
  return (
    <HeroUIAccordion.Indicator className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIAccordion.Indicator>
  );
}

function AccordionContent({ children, className, nativeProps, webProps }: AccordionContentProps) {
  void webProps;
  return (
    <HeroUIAccordion.Content className={className} {...(nativeProps as any)}>
      {children}
    </HeroUIAccordion.Content>
  );
}

export const Accordion = Object.assign(AccordionRoot, {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Indicator: AccordionIndicator,
  Content: AccordionContent,
});

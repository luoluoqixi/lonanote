import { Accordion as HeroUIAccordion } from "@heroui/react";
import clsx from "clsx";

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
  void nativeProps;

  const content =
    children ??
    items?.map((item) => (
      <HeroUIAccordion.Item className={clsx(itemClassName, item.itemClassName)} key={item.key}>
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
        <HeroUIAccordion.Panel className={clsx(contentClassName, item.contentClassName)}>
          {item.content}
        </HeroUIAccordion.Panel>
      </HeroUIAccordion.Item>
    ));

  return (
    <HeroUIAccordion
      aria-label={accessibilityLabel}
      className={className}
      hideSeparator={hideSeparator}
      variant={variant}
      {...(webProps as any)}
    >
      {content}
    </HeroUIAccordion>
  );
}

function AccordionItem({ children, className, nativeProps, webProps }: AccordionItemProps) {
  void nativeProps;
  return (
    <HeroUIAccordion.Item className={className} {...(webProps as any)}>
      {children}
    </HeroUIAccordion.Item>
  );
}

function AccordionTrigger({ children, className, nativeProps, webProps }: AccordionTriggerProps) {
  void nativeProps;
  return (
    <HeroUIAccordion.Trigger className={className} {...(webProps as any)}>
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
  void nativeProps;
  return (
    <HeroUIAccordion.Indicator className={className} {...(webProps as any)}>
      {children}
    </HeroUIAccordion.Indicator>
  );
}

function AccordionContent({ children, className, nativeProps, webProps }: AccordionContentProps) {
  void nativeProps;
  return (
    <HeroUIAccordion.Panel className={className} {...(webProps as any)}>
      {children}
    </HeroUIAccordion.Panel>
  );
}

export const Accordion = Object.assign(AccordionRoot, {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Indicator: AccordionIndicator,
  Content: AccordionContent,
});

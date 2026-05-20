import { Accordion as HeroUIAccordion } from "@heroui/react";

import type {
  AccordionContentProps,
  AccordionIndicatorProps,
  AccordionItemProps,
  AccordionProps,
  AccordionTriggerProps,
} from "./types";

function AccordionRoot({
  children,
  className,
  hideSeparator,
  nativeProps,
  variant,
  webProps,
}: AccordionProps) {
  void nativeProps;
  return (
    <HeroUIAccordion
      className={className}
      hideSeparator={hideSeparator}
      variant={variant}
      {...(webProps as any)}
    >
      {children}
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

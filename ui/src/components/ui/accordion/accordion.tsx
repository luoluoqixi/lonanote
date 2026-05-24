import type { ComponentType, ReactNode } from "react";
import { Accordion as TamaguiAccordion } from "tamagui";

import { resolveAriaLabel } from "@/components/ui/utils";

import type {
  AccordionContentProps,
  AccordionHeaderProps,
  AccordionItemProps,
  AccordionProps,
  AccordionTriggerProps,
} from "./types";

type AccordionPrimitiveProps = { children?: ReactNode; [key: string]: unknown };
const AccordionPrimitive = TamaguiAccordion as unknown as ComponentType<AccordionPrimitiveProps>;

function AccordionRoot(props: AccordionProps) {
  const { children, contentProps, headerProps, itemProps, items, triggerProps, ...rootProps } =
    props;
  const content =
    children ??
    items?.map((item) => (
      <AccordionItem
        {...itemProps}
        disabled={item.disabled ?? itemProps?.disabled}
        key={item.value}
        value={item.value}
      >
        <AccordionHeader {...headerProps}>
          <AccordionTrigger
            {...triggerProps}
            aria-label={resolveAriaLabel(
              item["aria-label"] ?? triggerProps?.["aria-label"],
              item.title,
            )}
          >
            {item.title}
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent {...contentProps}>{item.content}</AccordionContent>
      </AccordionItem>
    ));

  if (rootProps.type === "multiple") {
    return <AccordionPrimitive {...rootProps}>{content}</AccordionPrimitive>;
  }

  return (
    <AccordionPrimitive {...rootProps} type={rootProps.type ?? "single"}>
      {content}
    </AccordionPrimitive>
  );
}

function AccordionTrigger(props: AccordionTriggerProps) {
  return <TamaguiAccordion.Trigger {...props} />;
}

function AccordionHeader(props: AccordionHeaderProps) {
  return <TamaguiAccordion.Header {...props} />;
}

function AccordionContent(props: AccordionContentProps) {
  return <TamaguiAccordion.Content {...props} />;
}

function AccordionItem(props: AccordionItemProps) {
  return <TamaguiAccordion.Item {...props} />;
}

export const Accordion = Object.assign(AccordionRoot, {
  Trigger: AccordionTrigger,
  Header: AccordionHeader,
  Content: AccordionContent,
  Item: AccordionItem,
});

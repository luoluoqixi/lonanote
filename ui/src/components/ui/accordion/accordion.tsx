import { Accordion as TamaguiAccordion } from "tamagui";

import type {
  AccordionContentProps,
  AccordionHeaderProps,
  AccordionItemProps,
  AccordionProps,
  AccordionTriggerProps,
} from "./types";

function AccordionRoot(props: AccordionProps) {
  const { children, contentProps, headerProps, itemProps, items, triggerProps, ...rootProps } =
    props;

  return (
    <TamaguiAccordion {...rootProps}>
      {children ??
        items?.map((item) => (
          <AccordionItem
            {...itemProps}
            disabled={item.disabled ?? itemProps?.disabled}
            key={item.value}
            value={item.value}
          >
            <AccordionHeader {...headerProps}>
              <AccordionTrigger {...triggerProps}>{item.title}</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent {...contentProps}>{item.content}</AccordionContent>
          </AccordionItem>
        ))}
    </TamaguiAccordion>
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

import { ChevronDown } from "@tamagui/lucide-icons-2";
import { Children, type ComponentType, type ReactNode, isValidElement } from "react";
import { SizableText, Square, Accordion as TamaguiAccordion } from "tamagui";

import { resolveAriaLabel } from "@/components/ui/utils";

import type {
  AccordionContentProps,
  AccordionHeaderProps,
  AccordionHeightAnimatorProps,
  AccordionItemProps,
  AccordionProps,
  AccordionTriggerProps,
} from "./types";

type AccordionPrimitiveProps = { children?: ReactNode; [key: string]: unknown };
const AccordionPrimitive = TamaguiAccordion as unknown as ComponentType<AccordionPrimitiveProps>;

function normalizeAccordionChildren(children: ReactNode) {
  return Children.map(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      return <SizableText>{child}</SizableText>;
    }

    if (isValidElement(child)) {
      return child;
    }

    return child;
  });
}

function AccordionRoot(props: AccordionProps) {
  if (props.type === "multiple") {
    return <AccordionMultipleRoot {...props} />;
  }

  return <AccordionSingleRoot {...props} />;
}

function getItemsContent(
  children: ReactNode,
  items: AccordionProps["items"],
  itemProps: AccordionProps["itemProps"],
  headerProps: AccordionProps["headerProps"],
  triggerProps: AccordionProps["triggerProps"],
  contentProps: AccordionProps["contentProps"],
) {
  return (
    children ??
    items?.map((item, index) => {
      const isLast = index === items.length - 1;

      return (
        <AccordionItem
          {...itemProps}
          disabled={item.disabled ?? itemProps?.disabled}
          key={item.value}
          mb={isLast ? 0 : -1}
          width={itemProps?.width ?? "100%"}
          value={item.value}
        >
          <AccordionHeader {...headerProps} width={headerProps?.width ?? "100%"}>
            <AccordionTrigger
              {...triggerProps}
              aria-label={resolveAriaLabel(
                item["aria-label"] ?? triggerProps?.["aria-label"],
                item.title,
              )}
              borderColor={triggerProps?.borderColor ?? "$borderColor"}
              borderWidth={triggerProps?.borderWidth ?? 1}
              flexDirection={triggerProps?.flexDirection ?? "row"}
              justify="space-between"
              width={triggerProps?.width ?? "100%"}
            >
              {({ open }: { open: boolean }) => (
                <>
                  <SizableText>{item.title}</SizableText>
                  <Square rotate={open ? "180deg" : "0deg"} transparent transition="quick">
                    <ChevronDown color="$color" size="$1" />
                  </Square>
                </>
              )}
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionHeightAnimator transition="300ms">
            <AccordionContent
              {...contentProps}
              borderColor={contentProps?.borderColor ?? "$borderColor"}
              borderTopWidth={contentProps?.borderTopWidth ?? 0}
              borderWidth={contentProps?.borderWidth ?? 1}
              enterStyle={contentProps?.enterStyle ?? { opacity: 0, y: -8 }}
              exitStyle={contentProps?.exitStyle ?? { opacity: 0 }}
              transition={contentProps?.transition ?? "300ms"}
              width={contentProps?.width ?? "100%"}
            >
              {item.content}
            </AccordionContent>
          </AccordionHeightAnimator>
        </AccordionItem>
      );
    })
  );
}

function AccordionSingleRoot(props: AccordionProps) {
  const { children, contentProps, headerProps, itemProps, items, triggerProps, ...rootProps } =
    props;

  return (
    <AccordionPrimitive
      {...rootProps}
      collapsible={rootProps.collapsible ?? true}
      type="single"
      width={rootProps.width ?? "100%"}
    >
      {getItemsContent(children, items, itemProps, headerProps, triggerProps, contentProps)}
    </AccordionPrimitive>
  );
}

function AccordionMultipleRoot(props: AccordionProps) {
  const { children, contentProps, headerProps, itemProps, items, triggerProps, ...rootProps } =
    props;

  return (
    <AccordionPrimitive {...rootProps} type="multiple" width={rootProps.width ?? "100%"}>
      {getItemsContent(children, items, itemProps, headerProps, triggerProps, contentProps)}
    </AccordionPrimitive>
  );
}

function AccordionTrigger(props: AccordionTriggerProps) {
  const { children, ...triggerProps } = props;
  const triggerChildren =
    typeof children === "function" ? children : normalizeAccordionChildren(children);

  return <TamaguiAccordion.Trigger {...triggerProps}>{triggerChildren}</TamaguiAccordion.Trigger>;
}

function AccordionHeader(props: AccordionHeaderProps) {
  return <TamaguiAccordion.Header {...props} />;
}

function AccordionContent(props: AccordionContentProps) {
  return <TamaguiAccordion.Content {...props} />;
}

function AccordionHeightAnimator(props: AccordionHeightAnimatorProps) {
  return <TamaguiAccordion.HeightAnimator {...props} />;
}

function AccordionItem(props: AccordionItemProps) {
  return <TamaguiAccordion.Item {...props} />;
}

export const Accordion = Object.assign(AccordionRoot, {
  Trigger: AccordionTrigger,
  Header: AccordionHeader,
  Content: AccordionContent,
  HeightAnimator: AccordionHeightAnimator,
  Item: AccordionItem,
});

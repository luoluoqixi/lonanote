import { Children, type ReactNode, isValidElement } from "react";
import { SizableText, Tabs as TamaguiTabs } from "tamagui";

import { resolveAriaLabel } from "@/components/ui/utils";

import type {
  TabsContentProps,
  TabsListProps,
  TabsProps,
  TabsTabProps,
  TabsTriggerProps,
} from "./types";

function normalizeTriggerChildren(children: ReactNode) {
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

function TabsRoot(props: TabsProps) {
  const {
    "aria-label": ariaLabel,
    children,
    contentProps,
    items,
    listProps,
    triggerProps,
    ...rootProps
  } = props;
  const resolvedListProps =
    ariaLabel != null
      ? ({
          ...listProps,
          "aria-label": listProps?.["aria-label"] ?? ariaLabel,
        } as TabsListProps)
      : listProps;

  return (
    <TamaguiTabs {...rootProps}>
      {children ??
        (items == null ? null : (
          <>
            <TabsList {...resolvedListProps}>
              {items.map((item) => (
                <TabsTrigger
                  {...triggerProps}
                  aria-label={resolveAriaLabel(
                    item["aria-label"] ?? triggerProps?.["aria-label"],
                    item.label,
                  )}
                  disabled={item.disabled ?? triggerProps?.disabled}
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {items.map((item) => (
              <TabsContent {...contentProps} key={item.value} value={item.value}>
                {item.content}
              </TabsContent>
            ))}
          </>
        ))}
    </TamaguiTabs>
  );
}

function TabsList(props: TabsListProps) {
  return <TamaguiTabs.List {...props} />;
}

function TabsTrigger(props: TabsTriggerProps) {
  const { children, ...triggerProps } = props;

  return (
    <TamaguiTabs.Trigger {...triggerProps}>
      {normalizeTriggerChildren(children)}
    </TamaguiTabs.Trigger>
  );
}

function TabsTab(props: TabsTabProps) {
  return <TamaguiTabs.Tab {...props} />;
}

function TabsContent(props: TabsContentProps) {
  return <TamaguiTabs.Content {...props} />;
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Tab: TabsTab,
  Content: TabsContent,
});

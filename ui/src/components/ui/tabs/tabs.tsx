import { Children, type ReactNode, isValidElement } from "react";
import { SizableText, Tabs as TamaguiTabs } from "tamagui";

import { resolveAriaLabel } from "@/components/ui/utils";

import type { TabsContentProps, TabsListProps, TabsProps, TabsTabProps } from "./types";

const DEFAULT_ACTIVE_STYLE = {
  backgroundColor: "$color3",
  borderColor: undefined,
} as const;

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
    tabProps,
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
                <TabsTab
                  {...tabProps}
                  aria-label={resolveAriaLabel(
                    item["aria-label"] ?? tabProps?.["aria-label"],
                    item.label,
                  )}
                  disabled={item.disabled ?? tabProps?.disabled}
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </TabsTab>
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

function TabsTab(props: TabsTabProps) {
  const { children, activeStyle, ...tabProps } = props;

  return (
    <TamaguiTabs.Tab {...tabProps} activeStyle={activeStyle ?? DEFAULT_ACTIVE_STYLE}>
      {normalizeTriggerChildren(children)}
    </TamaguiTabs.Tab>
  );
}

function TabsContent(props: TabsContentProps) {
  return <TamaguiTabs.Content {...props} />;
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTab,
  Content: TabsContent,
});

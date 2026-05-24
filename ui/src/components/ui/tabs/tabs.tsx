import { Tabs as TamaguiTabs } from "tamagui";

import type {
  TabsContentProps,
  TabsListProps,
  TabsProps,
  TabsTabProps,
  TabsTriggerProps,
} from "./types";

function TabsRoot(props: TabsProps) {
  const { children, contentProps, items, listProps, triggerProps, ...rootProps } = props;

  return (
    <TamaguiTabs {...rootProps}>
      {children ??
        (items == null ? null : (
          <>
            <TabsList {...listProps}>
              {items.map((item) => (
                <TabsTrigger
                  {...triggerProps}
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
  return <TamaguiTabs.Trigger {...props} />;
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

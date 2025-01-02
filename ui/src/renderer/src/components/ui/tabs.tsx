import {
  TabsRootProps as ChakraTabsRootProps,
  TabsTriggerProps as ChakraTabsTriggerProps,
  Tabs as CharkaTabs,
  TabsListProps as CharkaTabsListProps,
} from '@chakra-ui/react';
import React from 'react';

import { Tooltip, TooltipProps } from './tooltip';

export interface TabType {
  value: string;
  title?: React.ReactNode;
  tooltip?: string;
}

export interface TabsProps extends ChakraTabsRootProps {
  tabs?: TabType[];
  triggerListProps?: CharkaTabsListProps;
  triggerProps?: Omit<ChakraTabsTriggerProps, 'value'>;
  triggersRender?: React.ReactNode;
  tooltipProps?: Omit<TooltipProps, 'content'>;
}

export const TabsContent = CharkaTabs.Content;
export const TabsTrigger = CharkaTabs.Trigger;

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(function Tabs(props, ref) {
  const { children, tabs, triggersRender, triggerListProps, triggerProps, tooltipProps, ...rest } =
    props;

  return (
    <CharkaTabs.Root ref={ref} {...rest}>
      <CharkaTabs.List {...triggerListProps}>
        {tabs?.map((item) => {
          const trigger = (k: string | undefined) => (
            <CharkaTabs.Trigger
              key={k}
              _hover={{ bg: 'primary.100' }}
              _selected={{ bg: 'primary.100' }}
              {...triggerProps}
              value={item.value}
            >
              {item.title}
            </CharkaTabs.Trigger>
          );
          return item.tooltip ? (
            <div key={item.value}>
              <Tooltip showArrow content={item.tooltip} {...tooltipProps}>
                {trigger(undefined)}
              </Tooltip>
            </div>
          ) : (
            trigger(item.value)
          );
        })}
        {triggersRender}
      </CharkaTabs.List>
      {children}
    </CharkaTabs.Root>
  );
});

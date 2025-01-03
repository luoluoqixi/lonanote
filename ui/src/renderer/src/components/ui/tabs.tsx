import type {
  TabsRootProps as ChakraTabsRootProps,
  TabsTriggerProps as ChakraTabsTriggerProps,
  TabsListProps as CharkaTabsListProps,
} from '@chakra-ui/react';
import { Tabs as CharkaTabs } from '@chakra-ui/react';
import React from 'react';

import type { TooltipProps } from './tooltip';
import { Tooltip } from './tooltip';

export interface TabType {
  value: string;
  title?: React.ReactNode;
  tooltip?: string;
}

export interface TabsProps extends ChakraTabsRootProps {
  tabs?: TabType[];
  itemRender?: (item: TabType) => React.ReactNode;
  triggersRender?: React.ReactNode;
  triggerListProps?: CharkaTabsListProps;
  triggerProps?: Omit<ChakraTabsTriggerProps, 'value'>;
  tooltipProps?: Omit<TooltipProps, 'content'>;
}

export const TabsContent = CharkaTabs.Content;
export const TabsTrigger = CharkaTabs.Trigger;

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>((props, ref) => {
  const {
    children,
    tabs,
    itemRender,
    triggersRender,
    triggerListProps,
    triggerProps,
    tooltipProps,
    ...rest
  } = props;

  return (
    <CharkaTabs.Root ref={ref} {...rest}>
      <CharkaTabs.List {...triggerListProps}>
        {tabs?.map((item) => {
          const trigger = (k: string | undefined) => (
            <CharkaTabs.Trigger
              key={k}
              _hover={{ bg: 'primary.100' }}
              _selected={{ bg: 'primary.100', color: 'primary.900' }}
              color="primary.700"
              {...triggerProps}
              value={item.value}
            >
              {itemRender ? itemRender(item) : item.title}
            </CharkaTabs.Trigger>
          );
          return item.tooltip ? (
            <Tooltip key={item.value} content={item.tooltip} {...tooltipProps}>
              {trigger(undefined)}
            </Tooltip>
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

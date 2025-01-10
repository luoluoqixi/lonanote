import type {
  TabsRootProps as ChakraTabsRootProps,
  TabsTriggerProps as ChakraTabsTriggerProps,
  TabsListProps as CharkaTabsListProps,
} from '@chakra-ui/react';
import { Tabs as CharkaTabs } from '@chakra-ui/react';
import React from 'react';

import type { TooltipProps } from '../tooltip';
import { Tooltip } from '../tooltip';

export interface TabType {
  value: string;
  title?: React.ReactNode;
  tooltip?: string;
}

export interface TabsProps extends ChakraTabsRootProps {
  tabs?: TabType[];
  itemRender?: (item: TabType) => React.ReactNode;
  onTriggerClick?: (item: TabType) => void;
  triggersRender?: React.ReactNode;
  triggerListProps?: CharkaTabsListProps;
  triggerProps?: Omit<ChakraTabsTriggerProps, 'value'>;
  tooltipProps?: Omit<TooltipProps, 'content'>;
  startTabIndex?: number;
}

export const TabsContent = CharkaTabs.Content;
export const TabsTrigger = CharkaTabs.Trigger;
export const TabsRoot = CharkaTabs.Root;
export const TabsList = CharkaTabs.List;

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>((props, ref) => {
  const {
    children,
    tabs,
    itemRender,
    onTriggerClick,
    triggersRender,
    triggerListProps,
    triggerProps,
    tooltipProps,
    startTabIndex,
    ...rest
  } = props;

  return (
    <CharkaTabs.Root ref={ref} {...rest}>
      <CharkaTabs.List {...triggerListProps}>
        {tabs?.map((item, index) => {
          const tabIndex = startTabIndex != null ? index + startTabIndex : undefined;
          const trigger = (k: string | undefined) => (
            <CharkaTabs.Trigger
              tabIndex={tabIndex}
              key={k}
              _hover={{
                bg: 'colorPalette.subtle',
                color: 'fg',
                _icon: { color: 'colorPalette.fg' },
              }}
              _selected={{
                bg: 'colorPalette.subtle',
                color: 'fg',
                _icon: { color: 'colorPalette.fg' },
              }}
              {...triggerProps}
              value={item.value}
              onClick={() => onTriggerClick?.(item)}
            >
              {itemRender ? itemRender(item) : item.title}
            </CharkaTabs.Trigger>
          );
          return item.tooltip ? (
            <Tooltip key={index} content={item.tooltip} {...tooltipProps}>
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

'use client';

import type { CollectionItem } from '@chakra-ui/react';
import { Select as ChakraSelect, Portal, createListCollection } from '@chakra-ui/react';
import * as React from 'react';
import { useMemo } from 'react';

import { CloseButton } from './close-button';

export interface SelectTriggerProps extends ChakraSelect.ControlProps {
  clearable?: boolean;
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  (props, ref) => {
    const { children, clearable, ...rest } = props;
    return (
      <ChakraSelect.Control {...rest}>
        <ChakraSelect.Trigger ref={ref}>{children}</ChakraSelect.Trigger>
        <ChakraSelect.IndicatorGroup>
          {clearable && <SelectClearTrigger />}
          <ChakraSelect.Indicator />
        </ChakraSelect.IndicatorGroup>
      </ChakraSelect.Control>
    );
  },
);

const SelectClearTrigger = React.forwardRef<HTMLButtonElement, ChakraSelect.ClearTriggerProps>(
  (props, ref) => {
    return (
      <ChakraSelect.ClearTrigger asChild {...props} ref={ref}>
        <CloseButton
          size="xs"
          variant="plain"
          focusVisibleRing="inside"
          focusRingWidth="2px"
          pointerEvents="auto"
        />
      </ChakraSelect.ClearTrigger>
    );
  },
);

export interface SelectContentProps extends ChakraSelect.ContentProps {
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement>;
}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>((props, ref) => {
  const { portalled = true, portalRef, ...rest } = props;
  return (
    <Portal disabled={!portalled} container={portalRef}>
      <ChakraSelect.Positioner>
        <ChakraSelect.Content {...rest} ref={ref} />
      </ChakraSelect.Positioner>
    </Portal>
  );
});

export const SelectItem = React.forwardRef<HTMLDivElement, ChakraSelect.ItemProps>((props, ref) => {
  const { item, children, ...rest } = props;
  return (
    <ChakraSelect.Item key={item.value} item={item} {...rest} ref={ref}>
      {children}
      <ChakraSelect.ItemIndicator />
    </ChakraSelect.Item>
  );
});

export interface SelectValueTextProps extends Omit<ChakraSelect.ValueTextProps, 'children'> {
  children?(items: CollectionItem[]): React.ReactNode;
}

export const SelectValueText = React.forwardRef<HTMLSpanElement, SelectValueTextProps>(
  (props, ref) => {
    const { children, ...rest } = props;
    return (
      <ChakraSelect.ValueText {...rest} ref={ref}>
        <ChakraSelect.Context>
          {(select) => {
            const items = select.selectedItems;
            if (items.length === 0) return props.placeholder;
            if (children) return children(items);
            if (items.length === 1) return select.collection.stringifyItem(items[0]);
            return `${items.length} selected`;
          }}
        </ChakraSelect.Context>
      </ChakraSelect.ValueText>
    );
  },
);

export const SelectRoot = React.forwardRef<HTMLDivElement, ChakraSelect.RootProps>((props, ref) => {
  return (
    <ChakraSelect.Root {...props} ref={ref} positioning={{ sameWidth: true, ...props.positioning }}>
      {props.asChild ? (
        props.children
      ) : (
        <>
          <ChakraSelect.HiddenSelect />
          {props.children}
        </>
      )}
    </ChakraSelect.Root>
  );
}) as ChakraSelect.RootComponent;

export interface SelectItemGroupProps extends ChakraSelect.ItemGroupProps {
  label: React.ReactNode;
}

export const SelectItemGroup = React.forwardRef<HTMLDivElement, SelectItemGroupProps>(
  (props, ref) => {
    const { children, label, ...rest } = props;
    return (
      <ChakraSelect.ItemGroup {...rest} ref={ref}>
        <ChakraSelect.ItemGroupLabel>{label}</ChakraSelect.ItemGroupLabel>
        {children}
      </ChakraSelect.ItemGroup>
    );
  },
);

export const SelectLabel = ChakraSelect.Label;
export const SelectItemText = ChakraSelect.ItemText;

export interface SelectValue {
  props?: ChakraSelect.ItemProps;
  label: string;
  value: string;
}

export interface SelectProps
  extends Omit<ChakraSelect.RootProps<any>, 'value' | 'onValueChange' | 'collection'> {
  label?: string | React.ReactNode;
  /** 如果在Dialog中使用Select, 需要将DialogContent的ref传递到这里, 不然Select显示不出来 */
  contentRef?: React.Ref<HTMLElement>;
  labelProps?: ChakraSelect.LabelProps;
  placeholder?: string;
  contentProps?: SelectContentProps;
  triggerProps?: SelectTriggerProps;
  itemsProps?: ChakraSelect.ItemProps;
  items?: Array<SelectValue>;
  value?: string | undefined;
  onValueChange?: (v: string | undefined) => void;
  values?: string[];
  onValuesChange?: (v: string[]) => void;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>((props, ref) => {
  const {
    children,
    label,
    contentRef,
    placeholder,
    contentProps,
    labelProps,
    triggerProps,
    itemsProps,
    items,
    value,
    onValueChange,
    values,
    onValuesChange,
    ...rest
  } = props;
  const itemsList = useMemo(() => {
    return createListCollection({
      items: items || [],
    });
  }, [items]);

  const onValueChangeFunc: ChakraSelect.RootProps<any>['onValueChange'] = onValueChange
    ? (e) => onValueChange(e.value.length > 0 ? e.value[0] : undefined)
    : onValuesChange
      ? (e) => onValuesChange(e.value)
      : undefined;

  return (
    <SelectRoot
      {...rest}
      ref={ref}
      collection={itemsList}
      value={value ? [value] : values}
      onValueChange={onValueChangeFunc}
    >
      <SelectLabel {...labelProps}>{label}</SelectLabel>
      <SelectTrigger {...triggerProps}>
        <SelectValueText placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent portalRef={contentRef as React.RefObject<HTMLDivElement>} {...contentProps}>
        {itemsList.items.map((item) => (
          <SelectItem {...itemsProps} {...item.props} item={item} key={item.value}>
            {item.label}
          </SelectItem>
        ))}
        {children}
      </SelectContent>
    </SelectRoot>
  );
});

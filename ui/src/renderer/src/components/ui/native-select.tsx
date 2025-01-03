'use client';

import { NativeSelect as Select } from '@chakra-ui/react';
import * as React from 'react';

export interface NativeSelectRootProps extends Select.RootProps {
  icon?: React.ReactNode;
}

export const NativeSelectRoot = React.forwardRef<HTMLDivElement, NativeSelectRootProps>(
  (props, ref) => {
    const { icon, children, ...rest } = props;
    return (
      <Select.Root ref={ref} {...rest}>
        {children}
        <Select.Indicator>{icon}</Select.Indicator>
      </Select.Root>
    );
  },
);

export interface NativeSelectItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface NativeSelectFieldProps extends Select.FieldProps {
  items?: Array<string | NativeSelectItem>;
}

export const NativeSelectField = React.forwardRef<HTMLSelectElement, NativeSelectFieldProps>(
  (props, ref) => {
    const { items: itemsProp, children, ...rest } = props;

    const items = React.useMemo(
      () =>
        itemsProp?.map((item) => (typeof item === 'string' ? { label: item, value: item } : item)),
      [itemsProp],
    );

    return (
      <Select.Field ref={ref} {...rest}>
        {children}
        {items?.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </Select.Field>
    );
  },
);

export interface NativeSelecProps extends NativeSelectFieldProps {
  root?: NativeSelectRootProps;
}

export const NativeSelect = React.forwardRef<HTMLDivElement, NativeSelecProps>((props, ref) => {
  const { root, ...rest } = props;
  return (
    <NativeSelectRoot ref={ref} {...root}>
      <NativeSelectField {...rest} />
    </NativeSelectRoot>
  );
});

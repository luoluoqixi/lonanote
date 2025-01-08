import { HStack, IconButton, IconButtonProps, NumberInput } from '@chakra-ui/react';
import * as React from 'react';
import { LuMinus, LuPlus } from 'react-icons/lu';

export interface StepperInputProps extends NumberInput.RootProps {
  label?: React.ReactNode;
  btnProps?: IconButtonProps;
}

export const StepperInput = React.forwardRef<HTMLDivElement, StepperInputProps>((props, ref) => {
  const { label, btnProps, ...rest } = props;
  return (
    <NumberInput.Root {...rest} unstyled ref={ref}>
      {label && <NumberInput.Label>{label}</NumberInput.Label>}
      <HStack gap="2">
        <DecrementTrigger btnProps={{ size: rest.size, ...btnProps }} />
        <NumberInput.ValueText textAlign="center" fontSize={rest.size || 'lg'} minW="3ch" />
        <IncrementTrigger btnProps={{ size: rest.size, ...btnProps }} />
      </HStack>
    </NumberInput.Root>
  );
});

type DecrementTriggerProps = NumberInput.DecrementTriggerProps & {
  btnProps?: IconButtonProps;
};
const DecrementTrigger = React.forwardRef<HTMLButtonElement, DecrementTriggerProps>(
  (props, ref) => {
    const { btnProps, ...rest } = props;
    return (
      <NumberInput.DecrementTrigger {...rest} asChild ref={ref}>
        <IconButton size="sm" variant="outline" {...btnProps}>
          <LuMinus />
        </IconButton>
      </NumberInput.DecrementTrigger>
    );
  },
);

type IncrementTriggerProps = NumberInput.IncrementTriggerProps & {
  btnProps?: IconButtonProps;
};
const IncrementTrigger = React.forwardRef<HTMLButtonElement, IncrementTriggerProps>(
  (props, ref) => {
    const { btnProps, ...rest } = props;
    return (
      <NumberInput.IncrementTrigger {...rest} asChild ref={ref}>
        <IconButton size="sm" variant="outline" {...btnProps}>
          <LuPlus />
        </IconButton>
      </NumberInput.IncrementTrigger>
    );
  },
);

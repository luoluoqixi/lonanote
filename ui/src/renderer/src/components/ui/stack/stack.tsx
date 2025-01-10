import type { StackProps as ChakraStackProps } from '@chakra-ui/react';
import { HStack as ChakraHStack, VStack as ChakraVStack } from '@chakra-ui/react';
import React from 'react';

export interface StackProps extends ChakraStackProps {}

export const HStack = React.forwardRef<HTMLDivElement, StackProps>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <ChakraHStack ref={ref} {...rest}>
      {children}
    </ChakraHStack>
  );
});

export const VStack = React.forwardRef<HTMLDivElement, StackProps>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <ChakraVStack ref={ref} {...rest}>
      {children}
    </ChakraVStack>
  );
});

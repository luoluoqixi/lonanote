import type { HeadingProps as ChakraHeadingProps } from '@chakra-ui/react';
import { Heading as ChakraHeading } from '@chakra-ui/react';
import React from 'react';

export interface HeadingProps extends ChakraHeadingProps {}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <ChakraHeading ref={ref} {...rest}>
      {children}
    </ChakraHeading>
  );
});

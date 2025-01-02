import type { IconProps as ChakraIconProps } from '@chakra-ui/react';
import { Icon as ChakraIcon } from '@chakra-ui/react';
import * as React from 'react';

export interface IconProps extends ChakraIconProps {}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(props, ref) {
  const { children, ...rest } = props;
  return (
    <ChakraIcon ref={ref} color="primary.700" {...rest}>
      {children}
    </ChakraIcon>
  );
});

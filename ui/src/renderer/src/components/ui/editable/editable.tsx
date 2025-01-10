import { Editable as ChakraEditable, EditableRootProps } from '@chakra-ui/react';
import * as React from 'react';
import { LuCheck, LuPencilLine, LuX } from 'react-icons/lu';

import { IconButton } from '../icon-button';

export interface EditableProps extends EditableRootProps {
  size?: EditableRootProps['size'];
  onFinish?: () => void;
}

export const Editable = React.forwardRef<HTMLDivElement, EditableProps>((props, ref) => {
  const { size = 'sm', onFinish, ...rest } = props;
  return (
    <ChakraEditable.Root ref={ref} size={size} {...rest}>
      <ChakraEditable.Preview />
      <ChakraEditable.Input />
      <ChakraEditable.Control>
        <ChakraEditable.EditTrigger asChild>
          <IconButton variant="ghost" size={size}>
            <LuPencilLine />
          </IconButton>
        </ChakraEditable.EditTrigger>
        <ChakraEditable.CancelTrigger asChild>
          <IconButton variant="outline" size={size}>
            <LuX />
          </IconButton>
        </ChakraEditable.CancelTrigger>
        <ChakraEditable.SubmitTrigger asChild>
          <IconButton variant="outline" size={size} onClick={onFinish}>
            <LuCheck />
          </IconButton>
        </ChakraEditable.SubmitTrigger>
      </ChakraEditable.Control>
    </ChakraEditable.Root>
  );
});

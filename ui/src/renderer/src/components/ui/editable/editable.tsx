import { Editable as ChakraEditable, EditableRootProps } from '@chakra-ui/react';
import * as React from 'react';
import { LuCheck, LuPencilLine, LuX } from 'react-icons/lu';

import { IconButton } from '../icon-button';

export interface EditableProps extends EditableRootProps {
  size?: EditableRootProps['size'];
  showEditBtn?: boolean;
  customEditRender?: React.ReactNode;
  customRightSlotRender?: (edit: boolean) => React.ReactNode;
  previewProps?: ChakraEditable.PreviewProps;
}

export const Editable = React.forwardRef<HTMLDivElement, EditableProps>((props, ref) => {
  const {
    size = 'sm',
    showEditBtn = true,
    customEditRender,
    customRightSlotRender,
    previewProps,
    ...rest
  } = props;
  const [edit, setEdit] = React.useState(false);
  return (
    <ChakraEditable.Root
      ref={ref}
      size={size}
      edit={edit}
      onEditChange={(e) => setEdit(e.edit)}
      {...rest}
    >
      <ChakraEditable.Preview
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        display="inline-block"
        {...previewProps}
      />
      <ChakraEditable.Input />
      <ChakraEditable.Control>
        {customRightSlotRender?.(edit)}
        {showEditBtn && (
          <ChakraEditable.EditTrigger asChild>
            {customEditRender ? (
              customEditRender
            ) : (
              <IconButton variant="ghost" size={size}>
                <LuPencilLine />
              </IconButton>
            )}
          </ChakraEditable.EditTrigger>
        )}
        <ChakraEditable.CancelTrigger asChild>
          <IconButton variant="outline" size={size}>
            <LuX />
          </IconButton>
        </ChakraEditable.CancelTrigger>
        <ChakraEditable.SubmitTrigger asChild>
          <IconButton variant="outline" size={size}>
            <LuCheck />
          </IconButton>
        </ChakraEditable.SubmitTrigger>
      </ChakraEditable.Control>
    </ChakraEditable.Root>
  );
});

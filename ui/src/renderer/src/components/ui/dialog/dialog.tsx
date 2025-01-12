import {
  Dialog as ChakraDialog,
  DialogBackdropProps,
  DialogPositionerProps,
  Portal,
} from '@chakra-ui/react';
import * as React from 'react';

import { CloseButton } from '../close-button';

export interface DialogContentProps extends ChakraDialog.ContentProps {
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement>;
  backdrop?: boolean;
  backdropProps?: DialogBackdropProps;
  positionerProps?: DialogPositionerProps;
}

let isPositionerDown = false;

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>((props, ref) => {
  const {
    children,
    portalled = true,
    positionerProps,
    portalRef,
    backdrop = true,
    backdropProps,
    ...rest
  } = props;

  return (
    <Portal disabled={!portalled} container={portalRef}>
      {backdrop && <ChakraDialog.Backdrop background="blackAlpha.200" {...backdropProps} />}
      <ChakraDialog.Positioner
        onPointerDown={() => (isPositionerDown = true)}
        onPointerUp={() => (isPositionerDown = false)}
        {...positionerProps}
      >
        <ChakraDialog.Content ref={ref} {...rest} asChild={false}>
          {children}
        </ChakraDialog.Content>
      </ChakraDialog.Positioner>
    </Portal>
  );
});

export const DialogCloseTrigger = React.forwardRef<
  HTMLButtonElement,
  ChakraDialog.CloseTriggerProps
>((props, ref) => {
  return (
    <ChakraDialog.CloseTrigger position="absolute" top="2" insetEnd="2" {...props} asChild>
      <CloseButton size="sm" ref={ref}>
        {props.children}
      </CloseButton>
    </ChakraDialog.CloseTrigger>
  );
});

export const DialogRoot: React.FC<ChakraDialog.RootProps> = (props) => {
  const { closeOnInteractOutside = true, ...rest } = props;
  const [open, setOpen] = React.useState(props.open);
  const onOpenChange = (e: { open: boolean }) => {
    if (props.onOpenChange) {
      props.onOpenChange(e);
    } else {
      setOpen(e.open);
    }
  };
  return (
    <ChakraDialog.Root
      closeOnInteractOutside={false}
      open={open || props.open}
      onOpenChange={onOpenChange}
      onPointerDownOutside={() => {
        if (closeOnInteractOutside && isPositionerDown) {
          onOpenChange({ open: false });
        }
      }}
      {...rest}
    >
      {props.children}
    </ChakraDialog.Root>
  );
};

export const DialogFooter = ChakraDialog.Footer;
export const DialogHeader = ChakraDialog.Header;
export const DialogBody = ChakraDialog.Body;
export const DialogBackdrop = ChakraDialog.Backdrop;
export const DialogTitle = ChakraDialog.Title;
export const DialogDescription = ChakraDialog.Description;
export const DialogTrigger = ChakraDialog.Trigger;
export const DialogActionTrigger = ChakraDialog.ActionTrigger;

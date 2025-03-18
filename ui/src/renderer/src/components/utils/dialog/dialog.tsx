import { AlertDialog, Button, Flex } from '@radix-ui/themes';

import { GlobalDialogOption, GlobalDialogType, useGlobalDialogStore } from '@/models/global';

export const showDialog = (options: GlobalDialogOption) => {
  const optionsNew: GlobalDialogType = { options, open: true };
  useGlobalDialogStore.setState(optionsNew);
};

export const closeDialog = () => {
  const s = useGlobalDialogStore.getState();
  if (s.open) {
    const onClose = s.options.onClose;
    useGlobalDialogStore.setState({ open: false, options: {} });
    if (onClose) {
      onClose();
    }
  }
};

export const GlobalDialog = () => {
  const state = useGlobalDialogStore();
  const ops = state.options;
  const close = () => {
    if (ops.onClose) {
      ops.onClose();
    }
  };
  return (
    <AlertDialog.Root
      open={state.open}
      onOpenChange={(open) => {
        if (!open) {
          useGlobalDialogStore.setState({ open: false });
          close();
        }
      }}
    >
      <AlertDialog.Content maxWidth="50vw">
        <AlertDialog.Title>{ops.title}</AlertDialog.Title>
        <AlertDialog.Description>{ops.description}</AlertDialog.Description>
        {ops.content}
        <Flex gap="3" mt="4" justify="end">
          {!ops.hideCancelBtn && (
            <AlertDialog.Action>
              <Button
                variant="soft"
                color="gray"
                onClick={(e) => {
                  const isClose = ops.onCancel?.();
                  e.stopPropagation();
                  e.preventDefault();
                  if (ops.closeCancel !== false && isClose !== false) {
                    useGlobalDialogStore.setState({ open: false });
                    close();
                  }
                }}
                {...ops.cancelBtnProps}
              >
                {ops.cancelText || '取消'}
              </Button>
            </AlertDialog.Action>
          )}
          {!ops.hideOkBtn && (
            <AlertDialog.Action>
              <Button
                variant="solid"
                onClick={(e) => {
                  const isClose = ops.onOk?.();
                  e.stopPropagation();
                  e.preventDefault();
                  if (ops.closeOk !== false && isClose !== false) {
                    useGlobalDialogStore.setState({ open: false });
                    close();
                  }
                }}
                {...ops.okBtnProps}
              >
                {ops.okText || '确定'}
              </Button>
            </AlertDialog.Action>
          )}
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};

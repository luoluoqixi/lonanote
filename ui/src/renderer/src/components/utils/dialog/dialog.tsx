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
        <AlertDialog.Description>{ops.content}</AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          {!ops.hideCancelBtn && (
            <AlertDialog.Action>
              <Button
                variant="soft"
                color="gray"
                onClick={() => {
                  ops.onCancel?.();
                  if (ops.closeCancel !== false) {
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
                color="red"
                onClick={() => {
                  ops.onOk?.();
                  if (ops.closeOk !== false) {
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

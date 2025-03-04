import { useRef } from 'react';

import { Button, Dialog } from '@/components/ui';
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
  const contentRef = useRef<HTMLDivElement>(null);
  const state = useGlobalDialogStore();
  const ops = state.options;
  const close = () => {
    if (ops.onClose) {
      ops.onClose();
    }
  };
  const cancelBtn = (
    <Button
      variant={ops.cancelBtnVariant || 'outline'}
      colorPalette={ops.cancelBtnColorPalette}
      onClick={() => {
        ops.onCancel?.();
      }}
    >
      {ops.cancelText || '取消'}
    </Button>
  );
  return (
    <Dialog.Root
      size={ops.size}
      placement={ops.placement || 'center'}
      motionPreset={ops.motionPreset}
      scrollBehavior={ops.scrollBehavior}
      closeOnInteractOutside
      open={state.open}
      onOpenChange={(v) => {
        if (v.open === false) {
          useGlobalDialogStore.setState({ open: false });
          close();
        }
      }}
    >
      <Dialog.Content ref={contentRef}>
        <Dialog.Header>
          <Dialog.Title>{ops.title}</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body overflow="auto">{ops.content}</Dialog.Body>
        {!ops.hideCancelBtn && !ops.hideOkBtn && (
          <Dialog.Footer>
            {!ops.hideCancelBtn && ops.closeCancel === false ? (
              cancelBtn
            ) : (
              <Dialog.ActionTrigger asChild>{cancelBtn}</Dialog.ActionTrigger>
            )}
            {!ops.hideOkBtn && (
              <Button
                variant={ops.okBtnVariant}
                colorPalette={ops.okBtnColorPalette}
                onClick={() => {
                  ops.onOk?.();
                  if (ops.closeOk !== false) {
                    useGlobalDialogStore.setState({ open: false });
                    close();
                  }
                }}
              >
                {ops.okText || '确定'}
              </Button>
            )}
          </Dialog.Footer>
        )}
        {!ops.hideCloseBtn && <Dialog.CloseTrigger />}
      </Dialog.Content>
    </Dialog.Root>
  );
};

import { Button as TamaguiButton, Dialog as TamaguiDialog, XStack, YStack } from "tamagui";

import type {
  DialogCloseProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogOverlayProps,
  DialogPortalProps,
  DialogProps,
  DialogTitleProps,
  DialogTriggerProps,
} from "./types";

function DialogRoot(props: DialogProps) {
  const {
    actions,
    children,
    closeLabel,
    closeProps,
    contentProps,
    description,
    descriptionProps,
    overlayProps,
    portalProps,
    title,
    titleProps,
    trigger,
    triggerProps,
    ...rootProps
  } = props;
  const hasDefaultStructure =
    trigger != null ||
    title != null ||
    description != null ||
    actions != null ||
    closeLabel != null;

  if (!hasDefaultStructure) {
    return <TamaguiDialog {...rootProps}>{children}</TamaguiDialog>;
  }

  return (
    <TamaguiDialog {...rootProps}>
      {trigger != null ? <DialogTrigger {...triggerProps}>{trigger}</DialogTrigger> : null}
      <DialogPortal {...portalProps}>
        <DialogOverlay {...overlayProps} />
        <DialogContent {...contentProps}>
          <YStack gap="$3">
            {title != null ? <DialogTitle {...titleProps}>{title}</DialogTitle> : null}
            {description != null ? (
              <DialogDescription {...descriptionProps}>{description}</DialogDescription>
            ) : null}
            {children}
            {actions != null || closeLabel != null ? (
              <XStack gap="$2" style={{ justifyContent: "flex-end" }}>
                {actions}
                {closeLabel != null ? (
                  <DialogClose {...closeProps} asChild>
                    <TamaguiButton>{closeLabel}</TamaguiButton>
                  </DialogClose>
                ) : null}
              </XStack>
            ) : null}
          </YStack>
        </DialogContent>
      </DialogPortal>
    </TamaguiDialog>
  );
}

function DialogTrigger(props: DialogTriggerProps) {
  return <TamaguiDialog.Trigger {...props} />;
}

function DialogPortal(props: DialogPortalProps) {
  return <TamaguiDialog.Portal {...props} />;
}

function DialogOverlay(props: DialogOverlayProps) {
  return <TamaguiDialog.Overlay {...props} />;
}

function DialogContent(props: DialogContentProps) {
  return <TamaguiDialog.Content {...props} />;
}

function DialogTitle(props: DialogTitleProps) {
  return <TamaguiDialog.Title {...props} />;
}

function DialogDescription(props: DialogDescriptionProps) {
  return <TamaguiDialog.Description {...props} />;
}

function DialogClose(props: DialogCloseProps) {
  return <TamaguiDialog.Close {...props} />;
}

export const Dialog = Object.assign(DialogRoot, {
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
});

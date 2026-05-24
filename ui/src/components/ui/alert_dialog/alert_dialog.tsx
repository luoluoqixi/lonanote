import {
  AlertDialog as TamaguiAlertDialog,
  Button as TamaguiButton,
  XStack,
  YStack,
} from "tamagui";

import type {
  AlertDialogActionProps,
  AlertDialogCancelProps,
  AlertDialogContentProps,
  AlertDialogDescriptionProps,
  AlertDialogDestructiveProps,
  AlertDialogOverlayProps,
  AlertDialogPortalProps,
  AlertDialogProps,
  AlertDialogTitleProps,
  AlertDialogTriggerProps,
} from "./types";

function AlertDialogRoot(props: AlertDialogProps) {
  const {
    actionLabel,
    actionProps,
    actions,
    cancelLabel,
    cancelProps,
    children,
    contentProps,
    description,
    descriptionProps,
    destructiveLabel,
    destructiveProps,
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
    cancelLabel != null ||
    actionLabel != null ||
    destructiveLabel != null;

  if (!hasDefaultStructure) {
    return <TamaguiAlertDialog {...rootProps}>{children}</TamaguiAlertDialog>;
  }

  return (
    <TamaguiAlertDialog {...rootProps}>
      {trigger != null ? (
        <AlertDialogTrigger {...triggerProps}>{trigger}</AlertDialogTrigger>
      ) : null}
      <AlertDialogPortal {...portalProps}>
        <AlertDialogOverlay {...overlayProps} />
        <AlertDialogContent {...contentProps}>
          <YStack gap="$3">
            {title != null ? <AlertDialogTitle {...titleProps}>{title}</AlertDialogTitle> : null}
            {description != null ? (
              <AlertDialogDescription {...descriptionProps}>{description}</AlertDialogDescription>
            ) : null}
            {children}
            {actions != null ||
            cancelLabel != null ||
            actionLabel != null ||
            destructiveLabel != null ? (
              <XStack gap="$2" style={{ justifyContent: "flex-end" }}>
                {actions}
                {cancelLabel != null ? (
                  <AlertDialogCancel {...cancelProps} asChild>
                    <TamaguiButton>{cancelLabel}</TamaguiButton>
                  </AlertDialogCancel>
                ) : null}
                {actionLabel != null ? (
                  <AlertDialogAction {...actionProps} asChild>
                    <TamaguiButton>{actionLabel}</TamaguiButton>
                  </AlertDialogAction>
                ) : null}
                {destructiveLabel != null ? (
                  <AlertDialogDestructive {...destructiveProps} asChild>
                    <TamaguiButton theme="red">{destructiveLabel}</TamaguiButton>
                  </AlertDialogDestructive>
                ) : null}
              </XStack>
            ) : null}
          </YStack>
        </AlertDialogContent>
      </AlertDialogPortal>
    </TamaguiAlertDialog>
  );
}

function AlertDialogTrigger(props: AlertDialogTriggerProps) {
  return <TamaguiAlertDialog.Trigger {...props} />;
}

function AlertDialogPortal(props: AlertDialogPortalProps) {
  return <TamaguiAlertDialog.Portal {...props} />;
}

function AlertDialogOverlay(props: AlertDialogOverlayProps) {
  return <TamaguiAlertDialog.Overlay {...props} />;
}

function AlertDialogContent(props: AlertDialogContentProps) {
  return <TamaguiAlertDialog.Content {...props} />;
}

function AlertDialogAction(props: AlertDialogActionProps) {
  return <TamaguiAlertDialog.Action {...props} />;
}

function AlertDialogCancel(props: AlertDialogCancelProps) {
  return <TamaguiAlertDialog.Cancel {...props} />;
}

function AlertDialogDestructive(props: AlertDialogDestructiveProps) {
  return <TamaguiAlertDialog.Destructive {...props} />;
}

function AlertDialogTitle(props: AlertDialogTitleProps) {
  return <TamaguiAlertDialog.Title {...props} />;
}

function AlertDialogDescription(props: AlertDialogDescriptionProps) {
  return <TamaguiAlertDialog.Description {...props} />;
}

export const AlertDialog = Object.assign(AlertDialogRoot, {
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Action: AlertDialogAction,
  Cancel: AlertDialogCancel,
  Destructive: AlertDialogDestructive,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
});

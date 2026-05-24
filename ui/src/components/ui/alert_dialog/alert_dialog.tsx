import { AlertDialog as TamaguiAlertDialog, XStack, YStack } from "tamagui";

import { isWeb } from "@/api/common/platform";
import { Button } from "@/components/ui/button";
import { resolveAriaLabel } from "@/components/ui/utils";

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
    actionAriaLabel,
    actionLabel,
    actionProps,
    actions,
    cancelAriaLabel,
    cancelLabel,
    cancelProps,
    children,
    contentProps,
    description,
    descriptionProps,
    destructiveAriaLabel,
    destructiveLabel,
    destructiveProps,
    overlayProps,
    portalProps,
    title,
    titleProps,
    trigger,
    triggerProps,
    disableRemoveScroll,
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
    <TamaguiAlertDialog disableRemoveScroll={disableRemoveScroll ?? isWeb()} {...rootProps}>
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
                    <Button aria-label={resolveAriaLabel(cancelAriaLabel, cancelLabel)}>
                      {cancelLabel}
                    </Button>
                  </AlertDialogCancel>
                ) : null}
                {actionLabel != null ? (
                  <AlertDialogAction {...actionProps} asChild>
                    <Button aria-label={resolveAriaLabel(actionAriaLabel, actionLabel)}>
                      {actionLabel}
                    </Button>
                  </AlertDialogAction>
                ) : null}
                {destructiveLabel != null ? (
                  <AlertDialogDestructive {...destructiveProps} asChild>
                    <Button
                      aria-label={resolveAriaLabel(destructiveAriaLabel, destructiveLabel)}
                      theme="red"
                    >
                      {destructiveLabel}
                    </Button>
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

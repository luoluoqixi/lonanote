import type { ReactElement } from "react";
import { AlertDialog as TamaguiAlertDialog, XStack, YStack } from "tamagui";

import { isWeb } from "@/api/common/platform";
import { Button } from "@/components/ui/button";
import {
  type OutsideInteractionEvent,
  preventDialogDismissForDragRegion,
} from "@/components/ui/dialog/dialog_outside_interaction";
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

type AlertDialogContentBaseProps = AlertDialogContentProps & {
  onInteractOutside?: (event: OutsideInteractionEvent) => void;
  onPointerDownOutside?: (event: OutsideInteractionEvent) => void;
};

const AlertDialogContentBase = TamaguiAlertDialog.Content as unknown as (
  props: AlertDialogContentBaseProps,
) => ReactElement | null;

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
        <AlertDialogOverlay
          opacity={0.5}
          animateOnly={["transform", "opacity"]}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          {...overlayProps}
        />
        <AlertDialogContent
          transition={[
            "quicker",
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: 20, opacity: 0 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          {...contentProps}
        >
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
  return <TamaguiAlertDialog.Trigger {...props} asChild />;
}

function AlertDialogPortal(props: AlertDialogPortalProps) {
  return <TamaguiAlertDialog.Portal {...props} />;
}

function AlertDialogOverlay(props: AlertDialogOverlayProps) {
  return <TamaguiAlertDialog.Overlay {...props} />;
}

function AlertDialogContent(props: AlertDialogContentProps) {
  const contentProps = props as AlertDialogContentBaseProps;
  const { onInteractOutside, onPointerDownOutside, ...restProps } = contentProps;

  return (
    <AlertDialogContentBase
      {...restProps}
      onPointerDownOutside={(event) => {
        onPointerDownOutside?.(event);
        preventDialogDismissForDragRegion(event);
      }}
      onInteractOutside={(event) => {
        onInteractOutside?.(event);
        preventDialogDismissForDragRegion(event);
      }}
    />
  );
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
